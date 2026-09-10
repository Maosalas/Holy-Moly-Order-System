# Corregir acceso y crear el primer administrador

## Diagnóstico confirmado

- La aplicación sí está conectada al servicio de autenticación activo.
- Actualmente ese servicio tiene **0 usuarios**, por lo que las credenciales de una cuenta anterior no pueden ser válidas aquí.
- El formulario ya permite registro, confirmación de correo, recuperación de contraseña e inicio de sesión.
- El acceso de administrador global se lee hoy desde datos editables asociados a la cuenta; se reemplazará por una asignación protegida en la base de datos.

## Implementación

1. **Crear la estructura segura de administradores**
   - Añadir una tabla independiente para roles globales.
   - Aplicar permisos y reglas para impedir que un usuario se otorgue privilegios a sí mismo.
   - Mantener separados los roles globales de los roles dentro de cada organización.

2. **Actualizar el inicio de sesión**
   - Cargar el rol global desde la base de datos después de validar la sesión.
   - Enviar al primer administrador a la administración global.
   - Mantener el flujo normal para propietarios y miembros de organizaciones.
   - Traducir el error `Invalid login credentials` a un mensaje claro en español, indicando registro o recuperación de contraseña.

3. **Dar de alta al primer administrador**
   - Registrar la cuenta desde la pantalla actual y confirmar su correo.
   - Una vez creada, asignarle el rol global de administrador mediante una operación protegida.
   - No solicitar ni guardar su contraseña fuera del formulario de registro.

4. **Verificar el flujo completo**
   - Probar registro, confirmación, inicio y cierre de sesión.
   - Confirmar que el administrador entra a su área global.
   - Confirmar que una cuenta normal no puede acceder ni asignarse ese rol.

## Resultado esperado

Las credenciales nuevas funcionarán contra el servicio activo, habrá un primer administrador verificable y los privilegios no dependerán de información manipulable desde el navegador.

## Paso requerido durante la implementación

Después de crear la estructura, tendrás que registrar la cuenta administrativa desde **Crear Cuenta** y confirmar el correo. En cuanto exista, se podrá completar su asignación como primer administrador sin compartir la contraseña.
