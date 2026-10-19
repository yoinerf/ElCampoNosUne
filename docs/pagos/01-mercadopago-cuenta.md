# 1. Cuenta de Mercado Pago de la plataforma

Con esta cuenta la plataforma **no recibe dinero de las ventas**: solo es la "aplicación" con la que
cada productor autoriza que se le cobre a su nombre (OAuth). El dinero va a la cuenta de cada productor.

> Al terminar tendrás 3 datos para el paso 3: **Client ID**, **Client Secret** y **clave secreta de Webhooks**.
> Guárdalos en un lugar seguro (no en el código ni en chats).

## 1.1 Crear la cuenta

1. Entra a https://www.mercadopago.com.co y crea una cuenta (o usa una existente) a nombre de
   CampoConecta / El Campo Nos Une.
   - Si tienes empresa: cuenta de **empresa** con NIT, Cámara de Comercio y representante legal.
   - Si no: cuenta de persona natural con cédula.
2. Completa la **verificación de identidad** (Tu perfil → Datos de la cuenta). Mercado Pago pide
   validar identidad para usar sus APIs en producción.
3. Agrega una cuenta bancaria (no es obligatoria para este modelo, pero Mercado Pago la pide para
   completar el perfil).

## 1.2 Crear la aplicación

1. Ve a https://www.mercadopago.com.co/developers/panel/app e inicia sesión con esa cuenta.
2. Clic en **Crear aplicación**.
3. Completa:
   - **Nombre**: `El Campo Nos Une`
   - **Tipo de solución**: **Pagos online**.
   - **¿Usas una plataforma de e-commerce?**: **No** (es desarrollo propio).
   - **Producto a integrar**: **Checkout Pro**.
   - Modelo de integración: **Marketplace** (si te lo pregunta).
4. Acepta los términos y crea la aplicación.

## 1.3 Copiar las credenciales

1. Dentro de la aplicación, ve a **Credenciales de producción** (menú izquierdo).
   - Si te lo pide, completa los datos del negocio (industria: alimentos / agro; sitio web: tu dominio).
2. Copia:
   - **Client ID** → será `MP_CLIENT_ID`
   - **Client Secret** → será `MP_CLIENT_SECRET`
3. Las credenciales de prueba se usan con las **cuentas de prueba** (paso 4); el Client ID y el
   Client Secret son los mismos para el OAuth.

## 1.4 Configurar la URL de redireccionamiento (OAuth)

Es la dirección a la que Mercado Pago devuelve al productor después de autorizar.

1. En la aplicación → **Editar aplicación** (o "Configuración avanzada").
2. En **URLs de redireccionamiento** agrega exactamente:

   ```
   https://dswurblpkdjywvgxcjfi.supabase.co/functions/v1/mp-oauth
   ```

3. Guarda los cambios.

## 1.5 Configurar los Webhooks (avisos de pago)

1. En la aplicación → **Webhooks** → **Configurar notificaciones**.
2. En **Modo de pruebas** y en **Modo productivo** pon la misma URL:

   ```
   https://dswurblpkdjywvgxcjfi.supabase.co/functions/v1/mp-webhook
   ```

3. En **Eventos** marca solo **Pagos** (`payment`).
4. Guarda. Mercado Pago muestra una **clave secreta** → será `MP_WEBHOOK_SECRET`.
   (Si no la ves, clic en "Revelar clave" o "Generar clave".)

## 1.6 (Opcional) Pedir el modelo 1:N

En Colombia, Mercado Pago solo habilita a todos el modelo **1:1** (un pago por productor). El modelo
**1:N** (un solo pago repartido entre productores, como ePayco) lo activa su equipo comercial a
cuentas con asesor. Si te interesa, pídelo desde la sección de ayuda o a tu ejecutivo comercial.
Si te lo aprueban, solo hay que adaptar la función `mp-create-payment`.

## Checklist

- [ ] Cuenta verificada
- [ ] Aplicación "El Campo Nos Une" creada (Checkout Pro)
- [ ] `MP_CLIENT_ID` y `MP_CLIENT_SECRET` copiados
- [ ] URL de redireccionamiento `.../functions/v1/mp-oauth` guardada
- [ ] Webhook `.../functions/v1/mp-webhook` con evento **Pagos** y `MP_WEBHOOK_SECRET` copiado

Siguiente: [02-epayco-cuenta.md](02-epayco-cuenta.md) o, si solo usarás Mercado Pago,
[03-supabase-migracion-y-despliegue.md](03-supabase-migracion-y-despliegue.md).
