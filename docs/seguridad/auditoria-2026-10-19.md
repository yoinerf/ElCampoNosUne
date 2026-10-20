# Auditoría de seguridad — 2026-10-19

Rama: `fix/auditoria-seguridad` (creada desde `dev` en `74c5604`).
Alcance: base de datos en vivo (RLS, políticas, funciones, triggers, vistas, Storage), Edge Functions
(`admin-users`, `notify-order`), frontend (React), dependencias y configuración del hosting (Azure).

## Cómo aplicar las correcciones

Las correcciones están en una migración. El frontend no cambia.

```bash
git checkout fix/auditoria-seguridad
npx supabase migration list --linked          # debe faltar solo 20261019130000
npx supabase db push --linked --dry-run       # revisa que sea solo esa migración
npx supabase db push --linked
```

> Si antes aplicas la rama `feature/pagos-en-linea`, también quedará pendiente su migración
> `20261019120000`. Son independientes y se pueden aplicar juntas, en orden.

La migración se probó en seco contra la base (en una transacción que se revierte), simulando los
ataques y el uso normal (ver "Verificación").

## Hallazgos corregidos

| # | Severidad | Hallazgo | Corrección |
|---|---|---|---|
| 1 | **Alta** | Un vendedor podía modificar **cualquier columna** de sus ítems de pedido (`order_items`): cantidad, producto, pedido, precio, total, estado de pago. Con eso podía: (a) inflar el inventario de **otro productor** cambiando `product_id` y luego cancelando el ítem (el trigger de stock devuelve unidades al producto indicado); (b) cambiar la cantidad antes de cancelar para devolver más stock del vendido; (c) mover ítems al pedido de otro cliente; (d) alterar precios y totales; (e) marcar el pago sin pasar por las transiciones de estado. | Trigger `trg_order_items_00_protect_fields`: fuera de superadmin y procesos del servidor, solo se puede cambiar `status_id`. `payment_status` lo sigue calculando la base a partir del estado. La app solo enviaba `status_id`, así que nada cambia para el usuario. |
| 2 | Media | **Suplantación de productor**: el nombre visible del producto/experiencia (`products.producer`, `experiences.host`) era texto libre del vendedor; podía publicar como "Cooperativa X". | `protect_catalog_fields` fija el nombre desde el perfil (organización o nombre y apellido), la misma regla que ya usaba la app. El superadmin puede seguir escribiéndolo. |
| 3 | Media | **Exposición de usuarios**: la vista `public_profiles` devolvía id, nombre y organización de **todos** los usuarios (compradores, administradores) a cualquiera, incluso sin iniciar sesión. | La vista solo devuelve productores/anfitriones, dueños de productos o experiencias y autores de reseñas, que son los únicos que la app muestra. En la base actual pasa de 7 a 4 perfiles (se ocultan 1 admin, 1 admin de tienda y 1 comprador sin reseñas). |
| 4 | Baja | Una solicitud de soporte podía enlazar un `order_item_id` de **otro cliente**. | Trigger `trg_support_tickets_guard_links`: el ítem debe pertenecer al pedido del propio comprador. La app no envía ese campo hoy. |
| 5 | Baja | Precios negativos permitidos en productos y experiencias (producían totales negativos en pedidos). | `check (price >= 0)`. No hay precios negativos en la base. |
| 6 | Baja | Sin límite de tamaño en textos que escriben los usuarios (descripciones, reseñas, solicitudes, datos de entrega que llegan del navegador en `create_store_order`): permitía cargar datos enormes. | Límites holgados: títulos 200, descripciones 5.000, reseñas 2.000, datos de entrega 8 KB. Los datos actuales están muy por debajo. |
| 7 | Baja | `reservations.quantity` sin validación. | `check (quantity between 1 and 10000)`. |

## Verificación (prueba en seco contra la base)

| Prueba | Resultado |
|---|---|
| Vendedor cambia la cantidad de su ítem | Bloqueado |
| Vendedor marca el pago directamente | Bloqueado |
| Vendedor cambia el estado (uso normal de la app) | Permitido |
| Productor publica con el nombre "Suplantado S.A." | Se guarda con el nombre de su perfil |
| Precio negativo | Bloqueado |
| `public_profiles` | 7 → 4 perfiles; los ocultos no aparecen en ninguna pantalla pública |

## Revisado sin hallazgos

- **RLS activo en todas las tablas**; las políticas limitan cada tabla a su dueño, a su tienda o al superadmin.
- **Roles**: el registro público solo acepta `comprador`, `asociacion` y `turismo`, siempre en la tienda
  principal. Nadie fuera del superadmin puede cambiar su rol o su tienda (triggers
  `guard_profile_insert` y `protect_profile_privileged_fields`).
- **Funciones `SECURITY DEFINER`**: todas tienen `search_path` fijo. Las funciones de trigger y las
  internas no son ejecutables por `anon` ni `authenticated`, y las expuestas (`create_store_order`,
  `complete_my_profile`, `submit_producer_document`, `review_producer_document`) validan quién llama.
- **Pedidos**: precios y stock se toman de la base, con bloqueo de filas. Los pedidos solo se crean por RPC.
- **Documentos de productores**: bucket privado; cada productor solo accede a su carpeta. Admins de
  tienda y superadmin ven los de su alcance. La validación del productor solo cambia por RPC.
- **Storage de imágenes**: buckets públicos de solo lectura, sin listado; solo se escribe en la
  carpeta propia, con límite de 5 MB y solo JPG/PNG.
- **Edge Functions**: `admin-users` lee rol y tienda desde la base (no del cuerpo de la petición);
  el admin de tienda está restringido a su tienda; la llave service role nunca sale del servidor.
  `notify-order` exige un secreto compartido comparado en tiempo constante.
- **Frontend**: sin `dangerouslySetInnerHTML`, `eval` ni enlaces construidos con datos del usuario;
  no hay secretos en el repositorio (solo la URL y la llave pública `anon` por variables de entorno).
- **Hosting (Azure)**: CSP estricta (`script-src 'self'`, `frame-ancestors 'none'`), HSTS,
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`.
- **Dependencias**: `npm audit --omit=dev` → 0 vulnerabilidades.

## Recomendaciones (requieren una decisión, no se cambiaron)

1. **Pedidos sin pagar reservan stock indefinidamente.** `create_store_order` descuenta el stock al
   crear el pedido, y `cancel_unpaid_store_orders` (que lo libera) **nunca se ejecuta**: `pg_cron` no
   está instalado y ninguna tienda tiene `payment_timeout_hours`. Alguien podría crear pedidos sin
   pagar para agotar el inventario de un productor. Para activarlo:
   1. Superadmin → Tiendas → poner un **Plazo para pagar (horas)**, por ejemplo 48.
   2. Supabase Dashboard → Database → Extensions → activar **pg_cron**.
   3. SQL Editor:
      ```sql
      select cron.schedule('cancelar-pedidos-sin-pago', '0 * * * *', $$select public.cancel_unpaid_store_orders()$$);
      ```
2. **Autenticación** (Supabase Dashboard → Authentication): activar *Leaked password protection*,
   revisar los *Rate limits* de registro e inicio de sesión, exigir confirmación de correo y
   considerar MFA para las cuentas de superadmin.
3. **Cambio de contraseña obligatorio**: la marca `must_change_password` vive en `user_metadata`, que
   el propio usuario puede modificar. Solo afecta a su propia cuenta (no es una escalada), pero si se
   quiere que sea obligatoria de verdad, debe guardarse en una tabla que el usuario no pueda editar.
4. **Reseñas**: cualquier usuario con sesión puede reseñar cualquier producto, varias veces, sin
   haberlo comprado. Conviene limitarlo a compradores con pedido entregado y a una reseña por producto.
5. **Imágenes**: `images.image_url` acepta cualquier URL. La CSP del sitio solo carga imágenes de
   Supabase y Unsplash, así que una URL externa no se muestra. Aun así, se puede validar el dominio en la base.
