# 2. Cuenta de ePayco y Pagos Divididos (split)

Con ePayco la cuenta de la plataforma es el **comercio principal**: cada pedido es un solo cobro
a su nombre y ePayco **reparte automáticamente** el dinero a la cuenta de cada productor
(**receptores**). La plataforma no se queda con comisión: el recargo que paga el comprador cubre
la tarifa de ePayco.

> Al terminar tendrás 4 datos para el paso 3: **PUBLIC_KEY**, **PRIVATE_KEY**, **P_CUST_ID_CLIENTE**
> y **P_KEY**. Guárdalos en un lugar seguro.

## 2.1 Crear la cuenta del comercio principal

1. Entra a https://epayco.com y clic en **Crear cuenta** / **Regístrate**.
2. Elige el tipo de cuenta:
   - **Persona jurídica** (recomendado para un marketplace): NIT, RUT, Cámara de Comercio
     (no mayor a 30 días), cédula del representante legal y certificación bancaria.
   - **Persona natural**: cédula, RUT y certificación bancaria.
3. Completa el formulario y carga los documentos. ePayco revisa y aprueba la cuenta
   (normalmente 1–3 días hábiles).
4. Inscribe la **cuenta bancaria** donde ePayco te consignará (aquí llegará solo el recargo que
   cubre la tarifa; las ventas van a los productores).

## 2.2 Solicitar la activación de Pagos Divididos (Split Payments)

Pagos Divididos **no viene activo** por defecto.

1. En el Dashboard de ePayco → **Soporte** / **Ayuda** → crear un **ticket** (o escribe a soporte).
2. Pide algo como:

   > Hola, somos un marketplace de productores agropecuarios. Solicitamos activar **Pagos Divididos
   > (Split Payments)** en nuestra cuenta (P_CUST_ID_CLIENTE: _tu ID_) para el **Smart Checkout v2**
   > (sesiones por Apify con `splitPayment`), con dispersión a varios receptores por transacción
   > y **fee 0** para el comercio principal. ¿Nos confirman el valor de `splitPayment.type`
   > que debemos usar (por ejemplo `percentage` o fijo) y quién asume la comisión de ePayco
   > en una transacción dividida?

3. Guarda la respuesta. Si ePayco indica un `type` distinto a `percentage`, configúralo en el
   secret `EPAYCO_SPLIT_TYPE` (paso 3).
4. Pregunta también la **tarifa** de tu contrato (porcentaje + valor fijo + IVA) para configurarla
   en el superadmin.

## 2.3 Copiar las llaves

1. Dashboard de ePayco → **Integraciones** → **Llaves API** (o "Configuración" → "Llaves secretas").
2. Copia:
   - **PUBLIC_KEY** → será `EPAYCO_PUBLIC_KEY`
   - **PRIVATE_KEY** → será `EPAYCO_PRIVATE_KEY`
   - **P_CUST_ID_CLIENTE** → será `EPAYCO_CUST_ID`
   - **P_KEY** → será `EPAYCO_P_KEY`

## 2.4 Configurar la URL de confirmación

La función `epayco-create-session` ya envía la URL de confirmación en cada cobro, pero conviene
dejarla también en el Dashboard por si se usa otra integración:

1. Dashboard → **Integraciones** → **Configuración** (o "Opciones de la pasarela").
2. **URL de confirmación**:

   ```
   https://dswurblpkdjywvgxcjfi.supabase.co/functions/v1/epayco-confirmation
   ```

3. Método: **POST**. Guarda.

## 2.5 Registrar el comercio principal en Pagos Divididos

Cuando ePayco active el módulo verás **Pagos Divididos → Split Payments** en el Dashboard, con dos
pestañas:

1. Pestaña **Comercios**: registra **tu propia cuenta** (P_CUST_ID_CLIENTE) como comercio principal.
2. Pestaña **Receptores**: registra también **tu propia cuenta** (ePayco exige que el principal esté
   en ambas pestañas).

## 2.6 Registrar a cada productor como receptor (se repite por productor)

Esto se hace cada vez que un productor pide activar ePayco en la plataforma
(lo verás en **Superadmin → Pagos → Cuentas de cobro de productores → Por activar**):

1. El productor debe tener **su propia cuenta ePayco** aprobada (ver
   [05-guia-productores.md](05-guia-productores.md)) y haber escrito su **ID de cliente**
   en la plataforma.
2. En tu Dashboard → **Pagos Divididos** → pestaña **Receptores** → **Agregar receptor**:
   escribe el **ID de cliente** del productor.
3. El productor, en **su** Dashboard, debe aceptar/configurar a tu comercio como **comercio asociado**
   (ePayco le envía la solicitud o él lo agrega en su pestaña Receptores).
4. Cuando quede asociado, vuelve a **Superadmin → Pagos** y clic en **Activar** en la fila del productor.

> Si activas a un productor sin registrarlo en ePayco, sus pagos fallarán: ePayco rechaza
> receptores que no existen o no están asociados.

## Checklist

- [ ] Cuenta ePayco aprobada (persona jurídica o natural)
- [ ] Ticket de activación de Pagos Divididos respondido y `splitPayment.type` confirmado
- [ ] `EPAYCO_PUBLIC_KEY`, `EPAYCO_PRIVATE_KEY`, `EPAYCO_CUST_ID`, `EPAYCO_P_KEY` copiados
- [ ] URL de confirmación `.../functions/v1/epayco-confirmation` guardada
- [ ] Comercio principal registrado en **Comercios** y **Receptores**

Siguiente: [03-supabase-migracion-y-despliegue.md](03-supabase-migracion-y-despliegue.md).
