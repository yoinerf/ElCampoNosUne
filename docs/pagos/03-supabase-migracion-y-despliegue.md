# 3. Migrar la base de datos, configurar secrets y desplegar funciones

Todos los comandos se ejecutan en la carpeta del proyecto
(`ElCampoNosUne`), en **PowerShell** o **Git Bash**. El proyecto de Supabase ya está vinculado
(`dswurblpkdjywvgxcjfi`).

> La migración deja todo **apagado**: aplicarla no cambia nada para los usuarios hasta que
> actives una pasarela en el superadmin. Aun así, hazla en un momento de poco tráfico.

## 3.1 Antes de empezar

1. Ten la última versión del código:

   ```bash
   git checkout dev
   git pull
   ```

2. Verifica que estás conectado a Supabase y al proyecto correcto:

   ```bash
   npx supabase projects list
   ```

   El proyecto `dswurblpkdjywvgxcjfi` debe aparecer marcado (●). Si te pide login:
   `npx supabase login`.

3. **Respaldo** (recomendado): Supabase Dashboard → **Database** → **Backups** y confirma que hay un
   respaldo reciente (en el plan gratuito, exporta con
   `npx supabase db dump --linked -f respaldo-antes-de-pagos.sql`).

## 3.2 Revisar qué migraciones faltan

```bash
npx supabase migration list --linked
```

Debe aparecer **solo una pendiente** (columna `Remote` vacía):

```
20261019120000   (vacío)   2026-10-19 12:00:00
```

## 3.3 Simular la migración (sin aplicar)

```bash
npx supabase db push --linked --dry-run
```

Debe listar únicamente `20261019120000_online_payments_split.sql`.

## 3.4 Aplicar la migración

```bash
npx supabase db push --linked
```

Confirma con `Y`. Al terminar, vuelve a correr `npx supabase migration list --linked`: ahora
`20261019120000` debe tener valor en `Remote`.

**Verificación rápida** (debe devolver 2 filas, ambas con `enabled = false`):

```bash
npx supabase db query --linked "select gateway, enabled, sandbox, percent_fee, fixed_fee from payment_gateway_settings"
```

### Qué crea la migración

- `payment_gateway_settings`: activación, modo pruebas y tarifas de cada pasarela.
- `seller_payment_accounts`, `seller_payment_credentials`, `payment_oauth_states`: cuentas de cobro de productores.
- `order_payments` y la columna `orders.payment_fee`: cobros de cada pedido.
- Funciones `gateway_fee`, `quote_online_payment`, `prepare_order_payments`, `apply_order_payment_result`,
  `request_epayco_receiver`, `set_seller_payment_status`, `disconnect_my_payment_account`.
- Métodos de pago `MercadoPago` y `Epayco` para pedidos y tiendas, y las reglas que impiden pagar en
  línea si la pasarela está apagada o un productor no tiene cuenta activa.

### Si algo sale mal

La migración se aplica en una transacción: si falla, no queda nada a medias. Copia el error y
revísalo antes de reintentar. Para revertir una migración ya aplicada, restaura el respaldo del 3.1.

## 3.5 Configurar los secrets

Puedes hacerlo por consola o en el Dashboard (**Edge Functions → Secrets → Add new secret**).
Pon solo los de las pasarelas que vayas a usar.

```bash
# Comunes
npx supabase secrets set APP_URL=https://TU-DOMINIO.com

# Mercado Pago (paso 1)
npx supabase secrets set MP_CLIENT_ID=xxxxxxxx MP_CLIENT_SECRET=xxxxxxxx MP_WEBHOOK_SECRET=xxxxxxxx

# ePayco (paso 2)
npx supabase secrets set EPAYCO_PUBLIC_KEY=xxxxxxxx EPAYCO_PRIVATE_KEY=xxxxxxxx EPAYCO_CUST_ID=xxxxxx EPAYCO_P_KEY=xxxxxxxx

# Solo si ePayco te indicó otro tipo de split (por defecto: percentage)
# npx supabase secrets set EPAYCO_SPLIT_TYPE=percentage
```

- `APP_URL` es la dirección pública de la web, **sin** `/` al final (ej. `https://elcamponosune.com`).
  Se usa para devolver al comprador y al productor a la web después de pagar o conectar su cuenta.
- Verifica: `npx supabase secrets list` (muestra los nombres, no los valores).

## 3.6 Desplegar las Edge Functions

`mp-oauth`, `mp-webhook` y `epayco-confirmation` **deben** desplegarse con `--no-verify-jwt`
porque Mercado Pago y ePayco las llaman sin sesión de Supabase (la seguridad la dan la firma y la
consulta a la API de la pasarela).

```bash
# Mercado Pago
npx supabase functions deploy mp-oauth --no-verify-jwt
npx supabase functions deploy mp-webhook --no-verify-jwt
npx supabase functions deploy mp-create-payment

# ePayco
npx supabase functions deploy epayco-confirmation --no-verify-jwt
npx supabase functions deploy epayco-create-session
```

Verifica con `npx supabase functions list`: deben aparecer con estado `ACTIVE`; las tres de
callback/webhook con `verify_jwt: false`.

## 3.7 Tipos de TypeScript (opcional)

El archivo `src/lib/database.types.ts` ya incluye las tablas y funciones nuevas. Si quieres
regenerarlo desde la base (en **Git Bash**, para evitar problemas de codificación de PowerShell):

```bash
npx supabase gen types typescript --linked > src/lib/database.types.ts
npm run typecheck
```

## 3.8 Publicar la web

Despliega el frontend como lo haces normalmente (rama `main` / hosting). Hasta que actives una
pasarela, los usuarios verán las opciones en línea como **Próximamente**.

## Checklist

- [ ] Respaldo hecho
- [ ] `npx supabase db push --linked` aplicado y verificado
- [ ] Secrets configurados (`APP_URL` + los de cada pasarela)
- [ ] Funciones desplegadas (callbacks con `--no-verify-jwt`)
- [ ] Web publicada

Siguiente: [04-activar-y-probar.md](04-activar-y-probar.md).
