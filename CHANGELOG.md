# Changelog

Cambios importantes de El Campo Nos Une, de la versión más reciente a la más antigua.

- **MAYOR** (`X.0.0`): cambios que requieren pasos especiales al desplegar o rompen lo anterior
  (migraciones obligatorias, cambios de arquitectura).
- **MENOR** (`2.X.0`): funcionalidades nuevas compatibles con lo existente.
- **PARCHE** (`2.0.X`): correcciones.

## [Sin publicar]

**Security**
- Auditoría de seguridad (informe en `docs/seguridad/auditoria-2026-10-19.md`). Requiere aplicar la
  migración `20261019130000_security_audit_fixes.sql`.
  - Los vendedores solo pueden cambiar el estado de sus ítems de pedido (antes podían alterar cantidad,
    producto, pedido y precios, e inflar el inventario de otros productores).
  - El nombre visible del productor/anfitrión se toma del perfil (evita suplantación).
  - `public_profiles` ya no expone a compradores ni administradores.
  - Las solicitudes de soporte solo pueden enlazar ítems del pedido del propio comprador.
  - Precios no negativos y límites de tamaño en textos de usuarios.

### Pendiente
- Notificaciones de pedidos por correo con Resend desde la Edge Function `notify-order`
  (en espera del dominio propio).

## [2.0.0] - 2026-10-18
Primera versión gestionada. Elimina el backend propio: toda la lógica de servidor vive en
Supabase (RLS, funciones RPC, triggers y Edge Functions).

**New Features**
- SuperAdmin
  - Se crea menú de Tiendas en perfil superadmin para administración de configuración de tiendas.
	- Se creó la tienda "Tienda Amazónica" sin logos, color verde y eslogan genérico.
	- Solo SuperAdmin puede cambiar roles o tiendas

- Admin de tiendas
  - Se creó perfil admindetiendas para cualquier tienda que se cree desde el perfil superadmin.
	- Se crearon vistas para que el admin de tienda pueda validar los documentos cargados por un vendedor.
	- Solo los admin de tienda pueden aprobar documentos y verificar productores.
	- Admin de tienda puede crear usuario y estos se asocian a su tienda automáticamente.

- Productores/Asociación
	- Se agregó restricción para crear productos si no se está verificado.
	- Se agregó opción para cargar documentos (RUT y camara de comercio) para ser verificado en una tienda.

- Generales
	- Se implementó inicio de sesión y registro mediante correo de google.
  - Se implementó funcionalidad de campanita de notificaciones.
	- Se cambió flujo de pago para pagar primero y hacer envío después.
  - Se agregan campos de tipo y numero de documento al crear usuario o editar.
	- Se quita el valor del envío y se agrega mensaje a revisar con el vendedor.
	- Se implementa versionado de app (2.0.0)
  - Se realiza refactor de código.


## [1.0.0] - 2026-10-16

Línea base: la aplicación tal como estaba en producción antes de empezar a gestionar versiones
(commit `4f246d4`). Marketplace de El Campo Nos Une, Tienda Amazónica, experiencias de turismo, paneles de
comprador, productor, admin de tienda y superadmin, checkout con backend propio y notificaciones por
WhatsApp.

[Sin publicar]: https://github.com/yoinerf/ElCampoNosUne/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/yoinerf/ElCampoNosUne/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/yoinerf/ElCampoNosUne/tree/v1.0.0
