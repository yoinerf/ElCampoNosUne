# 4. Activar desde el superadmin, probar y pasar a producción

## 4.1 Configurar las tarifas

1. Inicia sesión como **superadmin** → menú lateral **Pagos**.
2. En la tarjeta de cada pasarela (Mercado Pago, ePayco) revisa:
   - **Comisión (%)**, **valor fijo (COP)**, **IVA sobre la comisión (%)**: los de tu contrato.
   - **Retenciones u otros cargos (%)** y **otros cargos fijos**: si tu contador indica que la
     pasarela descuenta retenciones (ReteFuente, ReteICA, ReteIVA), ponlas aquí para que también
     se le sumen al comprador.
   - **Sumar la tarifa al comprador**: marcado = el productor recibe el valor completo.
3. Mira el **Ejemplo** de la tarjeta para confirmar el cálculo y clic en **Guardar**.

## 4.2 Modo de pruebas (sandbox)

### Mercado Pago

1. En https://www.mercadopago.com.co/developers/panel/app → tu aplicación → **Cuentas de prueba**,
   crea:
   - 1 cuenta **Vendedor** por cada productor de prueba (ej. 2 vendedores).
   - 1 cuenta **Comprador**.
   Anota usuario y contraseña de cada una.
2. En **Superadmin → Pagos → Mercado Pago**: deja **Modo de pruebas** marcado, marca
   **Pagos con Mercado Pago activos** y guarda.

### ePayco

1. Pide a ePayco credenciales/entorno de pruebas si tu cuenta aún no está en producción
   (las llaves de la cuenta funcionan con `test: true`).
2. En **Superadmin → Pagos → ePayco**: deja **Modo de pruebas** marcado, marca
   **Pagos con ePayco activos** y guarda.

## 4.3 Ofrecer la pasarela en una tienda

1. **Superadmin → Tiendas** → editar la tienda (ej. El Campo Nos Une).
2. En **Métodos de pago** marca **Mercado Pago** y/o **ePayco**.
3. **Costo de envío** debe estar en **0** (el envío lo acuerda cada productor; con envío fijo el pago
   en línea no se ofrece).
4. Guarda.

## 4.4 Conectar productores de prueba

Con 2 usuarios productores de prueba (rol Asociación), entra a **Panel → Configuración →
Cobros en línea**:

- **Mercado Pago**: clic en **Conectar Mercado Pago**, inicia sesión con una cuenta **Vendedor de
  prueba** y autoriza. Debe volver al panel con "¡Listo! Tu cuenta de Mercado Pago quedó conectada."
- **ePayco**: escribe el ID de cliente de una cuenta ePayco de prueba y **Guardar ID**. Luego, como
  superadmin: regístralo como receptor en ePayco ([02-epayco-cuenta.md](02-epayco-cuenta.md#26-registrar-a-cada-productor-como-receptor-se-repite-por-productor))
  y en **Superadmin → Pagos → Cuentas de cobro** clic en **Activar**.

## 4.5 Compra de prueba

1. Inicia sesión como **comprador** (en otro navegador o ventana privada).
2. Agrega al carrito productos de **los 2 productores**.
3. En el paso 3 del checkout elige la pasarela:
   - Verás la **tarifa de procesamiento** y el reparto por productor.
4. Paga:
   - **Mercado Pago**: verás un botón "Pagar a …" por productor. Abre cada uno, inicia sesión con la
     cuenta **Comprador de prueba** y paga con una
     [tarjeta de prueba](https://www.mercadopago.com.co/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards)
     (titular `APRO` para aprobado).
   - **ePayco**: se abre el checkout de ePayco; usa las tarjetas de prueba que indica ePayco
     (en modo pruebas el checkout las muestra).
5. Verifica:
   - En **Pedidos** (superadmin o panel del productor) los ítems pasan a **Pagado** cuando llega la
     confirmación (Mercado Pago: cada productor por separado; ePayco: todo el pedido).
   - En la cuenta de cada vendedor/receptor de prueba aparece su parte.
   - Consulta en la base (opcional):

     ```bash
     npx supabase db query --linked "select gateway, status, base_amount, fee_amount, total_amount, provider_status from order_payments order by created_at desc limit 5"
     ```

### Si el pago no se marca como pagado

- Supabase Dashboard → **Edge Functions** → `mp-webhook` o `epayco-confirmation` → **Logs**.
  - `firma inválida` / respuesta 401: revisa `MP_WEBHOOK_SECRET` o `EPAYCO_CUST_ID`/`EPAYCO_P_KEY`.
  - `cuenta … no registrada`: el productor no conectó su cuenta o se conectó otra.
  - `Monto pagado menor al esperado`: cambió la tarifa después de crear el cobro; reintenta el pago.
- En ePayco: si la sesión no se crea, revisa los logs de `epayco-create-session` (llaves Apify o
  configuración del split; pregunta a soporte por el `splitPayment.type`).

## 4.6 Pasar a producción

1. Confirma que las pruebas funcionaron con ambas pasarelas que vayas a usar.
2. Cada productor debe conectar su cuenta **real** (Mercado Pago verificada / ePayco aprobada y
   registrada como receptor). Las conexiones de prueba se deben quitar: el productor clic en
   **Desconectar** / **Quitar** y vuelve a conectar con la real.
3. **Superadmin → Pagos**: desmarca **Modo de pruebas** y guarda.
4. Haz una compra real de bajo valor para confirmar.
5. Anota en `CHANGELOG.md` la publicación (versión menor nueva, ej. `2.1.0`).

## 4.7 Apagar una pasarela

**Superadmin → Pagos** → desmarca **Pagos con … activos** → Guardar. Los compradores dejan de verla
de inmediato; los pedidos ya creados conservan sus cobros.

## Checklist

- [ ] Tarifas configuradas y guardadas
- [ ] Pasarela activa en modo pruebas
- [ ] Tienda con el método de pago y envío en 0
- [ ] 2 productores de prueba conectados/activados
- [ ] Compra de prueba con 2 productores → pedido **Pagado** y dinero en cada cuenta
- [ ] Modo de pruebas desactivado y compra real verificada
