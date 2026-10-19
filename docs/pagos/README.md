# Pagos en línea: Mercado Pago y ePayco

Guía para poner en marcha los pagos en línea de **El Campo Nos Une**, desde crear las cuentas
hasta migrar la base de datos y activarlos. El código ya está listo; todo está **apagado**
hasta que lo actives desde **Superadmin → Pagos**.

## Orden recomendado

| Paso | Archivo | Quién | Tiempo aprox. |
|---|---|---|---|
| 1 | [01-mercadopago-cuenta.md](01-mercadopago-cuenta.md): crear y configurar la cuenta de Mercado Pago | Dueño de la plataforma | 30–60 min (+ verificación de MP) |
| 2 | [02-epayco-cuenta.md](02-epayco-cuenta.md): crear la cuenta de ePayco y activar Pagos Divididos | Dueño de la plataforma | 1–3 días hábiles (ePayco revisa documentos y activa el split) |
| 3 | [03-supabase-migracion-y-despliegue.md](03-supabase-migracion-y-despliegue.md): migrar la base, configurar los secrets y desplegar las funciones | Desarrollador | 20 min |
| 4 | [04-activar-y-probar.md](04-activar-y-probar.md): activar desde el superadmin, hacer pruebas y pasar a producción | Superadmin | 30 min |
| 5 | [05-guia-productores.md](05-guia-productores.md): guía para que cada productor conecte su cuenta | Productores | 10 min cada uno |

No necesitas las dos pasarelas: puedes hacer solo Mercado Pago (pasos 1, 3, 4), solo ePayco
(pasos 2, 3, 4) o ambas. El paso 3 sirve para las dos.

## Cómo funciona cada pasarela

| | Mercado Pago | ePayco |
|---|---|---|
| ¿A dónde va el dinero? | Directo a la cuenta Mercado Pago de cada productor | Directo a la cuenta ePayco de cada productor (receptor) |
| Carrito con 3 productores | **3 pagos**, uno por productor | **1 solo pago** que ePayco reparte |
| Cómo se conecta el productor | Botón "Conectar Mercado Pago" (OAuth, automático) | Escribe su ID de cliente ePayco; el superadmin lo activa después de registrarlo como receptor |
| Tarifa al comprador | Una por cada pago (cada pago tiene su valor fijo) | Una sola sobre el total (más barato con varios productores) |
| Comisión de la plataforma | 0 | 0 |

## La tarifa de la pasarela

Se configura por pasarela en **Superadmin → Pagos**: porcentaje, valor fijo, IVA sobre la comisión,
retenciones u otros cargos (%) y otros cargos fijos. La base de datos la calcula
(función `gateway_fee`) y la suma al pago del comprador para que el productor reciba el valor
completo de su venta:

```
total = (base + fijo × (1 + IVA) + fijo_extra) / (1 − % × (1 + IVA) − %_extra)   → redondeado hacia arriba
```

Ejemplo (3,29 % + $800 + IVA 19 %): una venta de $50.000 se cobra en $53.029. Mercado Pago
descuenta ≈ $3.029 y al productor le quedan $50.000.

El navegador solo **muestra** la tarifa: los montos reales salen de la base (`quote_online_payment`,
`prepare_order_payments`), así que un comprador no puede cambiarlos.

## Seguridad (resumen)

- Precios, cantidades y tarifas se calculan en la base, nunca se reciben del navegador.
- No se puede crear un pedido en línea si la pasarela está apagada o si algún productor del carrito
  no tiene su cuenta de cobro activa (triggers `guard_online_order` y `guard_online_order_item`).
- Las credenciales de Mercado Pago de los productores están en `seller_payment_credentials`, que
  solo lee el servidor (service role).
- Los webhooks verifican la firma de la pasarela, **consultan el pago directamente en la API** de la
  pasarela y validan que el monto pagado sea el esperado antes de marcar el pedido como pagado.

## Piezas del código

| Pieza | Qué hace |
|---|---|
| `supabase/migrations/20261019120000_online_payments_split.sql` | Tablas, tarifas, cotización, cobros, reglas y permisos |
| `supabase/functions/mp-oauth` | Conecta la cuenta de Mercado Pago del productor |
| `supabase/functions/mp-create-payment` | Crea un cobro de Mercado Pago por productor |
| `supabase/functions/mp-webhook` | Confirma los pagos de Mercado Pago |
| `supabase/functions/epayco-create-session` | Crea el cobro de ePayco con el reparto entre productores |
| `supabase/functions/epayco-confirmation` | Confirma los pagos de ePayco |
| `src/lib/payments.ts` | Cliente web: configuración, cotización, pagos, cuentas |
| `src/components/PaymentAccountsCard.tsx` | Tarjeta del productor (Panel → Configuración) |
| `src/components/superadmin/PaymentGatewayManager.tsx` | Activación y tarifas (Superadmin → Pagos) |
| `src/components/superadmin/SellerPaymentAccounts.tsx` | Activar receptores de ePayco (Superadmin → Pagos) |
