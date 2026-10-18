# Changelog

Cambios importantes de El Campo Nos Une, de la versión más reciente a la más antigua.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen
[Versionado Semántico](https://semver.org/lang/es/):

- **MAYOR** (`X.0.0`): cambios que requieren pasos especiales al desplegar o rompen lo anterior
  (migraciones obligatorias, cambios de arquitectura).
- **MENOR** (`2.X.0`): funcionalidades nuevas compatibles con lo existente.
- **PARCHE** (`2.0.X`): correcciones.

## Cómo publicar una versión

1. Mover lo que esté en **[Sin publicar]** a una sección nueva con número y fecha.
2. Actualizar `"version"` en `package.json` (la app la muestra en Superadmin → Configuración).
3. Commit en `dev` y etiqueta: `git tag -a vX.Y.Z -m "vX.Y.Z"` → `git push origin vX.Y.Z`.
4. Aplicar las migraciones y desplegar las Edge Functions que indique la versión **antes** del frontend.

## [Sin publicar]

### Pendiente
- Notificaciones de pedidos por correo con Resend desde la Edge Function `notify-order`
  (en espera del dominio propio).

## [2.0.0] - 2026-10-18

Primera versión gestionada. Elimina el backend propio: toda la lógica de servidor vive en
Supabase (RLS, funciones RPC, triggers y Edge Functions).

### Antes de desplegar
Aplicar las migraciones y desplegar las Edge Functions **antes** de publicar el frontend:

```bash
supabase db push                                       # supabase/migrations/20261018*.sql
supabase functions deploy admin-users notify-order
supabase secrets set ALLOWED_ORIGINS=https://<dominio-de-produccion>
```

Para el inicio de sesión con Google:
- En Google Cloud Console, la URI de redirección autorizada debe ser `https://<proyecto>.supabase.co/auth/v1/callback`.
- En Supabase → Authentication → URL Configuration, agregar el dominio de producción (y el de desarrollo local)
  a Redirect URLs.

### Seguridad
- `profiles` ya no es legible públicamente (exponía correo y teléfono de todos los usuarios). Los nombres
  públicos de productores y autores de reseñas salen de la vista `public_profiles`.
- Los pedidos solo se crean con `create_store_order`: precios, stock y envío se calculan en el servidor
  (el envío lo enviaba el navegador).
- Se eliminaron políticas por `created_by` que permitían publicar a nombre de otro productor validado.
- Un trigger protege la calificación, el número de reseñas y el destacado del catálogo.
- El usuario ya no puede cambiar el estado de sus reservas.
- Se revocó la ejecución pública de funciones `SECURITY DEFINER` internas.
- Edge Functions: CORS configurable, errores genéricos hacia el cliente, validación de UUID y comparación del
  secreto del webhook en tiempo constante.
- Cabeceras de seguridad en Azure Static Web Apps (CSP, HSTS, X-Frame-Options, entre otras).
- La reserva de experiencias ya no simula pagos aprobados con Wompi.

### Agregado
- **Tiendas parametrizables** desde Superadmin → Tiendas: cada tienda tiene vitrina en `/<ruta>`, marca,
  carrito, métodos de pago y envío propios, sin tocar código.
- **Inicio de sesión con Google**. La primera vez se pide completar el perfil (tipo de cuenta, documento y
  ubicación).
- **Documento de identidad** (tipo y número) en el registro y en la edición de datos.
- **Departamento y municipio** con listas desplegables (DANE, librería `soff-geo`).
- **Mi cuenta** para el admin de tienda y el superadmin: datos personales y cambio de contraseña.
- Botón **Ver tienda** en el panel del admin de tienda.
- **URL por pantalla**: se puede recargar, compartir el enlace y usar el botón atrás.
- Transferencia bancaria en El Campo Nos Une.
- La versión de la app se muestra en Superadmin → Configuración.

### Cambiado
- **Login y registro únicos** de El Campo Nos Une para todas las tiendas. El productor de otra tienda se
  registra aquí y el superadmin le asigna su tienda.
- El admin de tienda crea productores directamente en su tienda.
- En pedidos pagados por transferencia o en efectivo, el productor solo puede prepararlos y enviarlos
  después de confirmar el pago (antes esto aplicaba solo en la Tienda Amazónica).
- La confirmación del pedido ya no muestra datos bancarios: indica que el productor se pondrá en contacto
  para continuar con el pago.
- El envío queda **a convenir con el productor** y no se suma al total.
- El registro ya no escribe el perfil desde el navegador: lo crea la base de datos.

### Corregido
- Las cuentas creadas con Google quedaban sin perfil: no existía el trigger `on_auth_user_created`.
- Las estadísticas de ventas del productor y del superadmin siempre mostraban 0 (leían una columna
  inexistente).
- Las experiencias consultaban una tabla de reseñas que no existe.
- El límite de tamaño de las imágenes de experiencias no coincidía con el del almacenamiento (6 MB frente a 5 MB).
- Los productos no traían su tipo ni el nombre de la categoría en algunas pantallas.

### Eliminado
- La dependencia del backend propio (`VITE_BACKEND_URL`).
- El flujo simulado de Wompi (`PaymentModal`). Wompi queda como "Próximamente".
- La lectura de la tabla `departments` (ahora se usa `soff-geo`).

### Técnico
- Tipos generados de Supabase (`createClient<Database>`) y ningún `any` en el código.
- `AuthProvider` y `StoresProvider`: sesión, rol y tiendas centralizados.
- `ErrorBoundary` para que un error no deje la pantalla en blanco.
- Componentes divididos: `ProductDetail`, la interfaz del superadmin, `LocationFields`, `DocumentFields`,
  `MyAccountCard`.
- ESLint (reglas de hooks de React), pruebas con Vitest y verificación en CI (tipos, lint, pruebas y build)
  antes de desplegar.

## [1.0.0] - 2026-10-16

Línea base: la aplicación tal como estaba en producción antes de empezar a gestionar versiones
(commit `4f246d4`). Marketplace de El Campo Nos Une, Tienda Amazónica, experiencias de turismo, paneles de
comprador, productor, admin de tienda y superadmin, checkout con backend propio y notificaciones por
WhatsApp.

[Sin publicar]: https://github.com/yoinerf/ElCampoNosUne/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/yoinerf/ElCampoNosUne/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/yoinerf/ElCampoNosUne/tree/v1.0.0
