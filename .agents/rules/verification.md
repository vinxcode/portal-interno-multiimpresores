# Protocolo de Verificación y Definition of Done (DoD)

## Criterios de Aceptación
Para declarar cualquier tarea o módulo como finalizado, deben ejecutarse y aprobarse los siguientes comandos y verificaciones sin excepciones:

### 1. Verificación de Tipos (TypeScript)
```bash
npx tsc --noEmit
```

### 2. Suite de Pruebas Unitarias (Vitest)

```bash
npm run test
```

### 3. Linting y Formateo

```bash
npm run lint
```

### 4. Compilación de Producción (Next.js Build)

```bash
npm run build
```

### 5. Checklist de Verificación Financiera y de Permisos

* [ ] **Precisión de Decimales:** Todos los valores monetarios se muestran con 2 decimales formateados (`$XX.XX`).
* [ ] **Sin Emojis:** No existe ningún emoji unicode en la interfaz ni en el código.
* [ ] **Contraseña Incorruptible:** La opción "recordar" solo guarda el código de usuario (`user_code`), no la contraseña.
* [ ] **Ticket Térmico POS:** El ticket de 80mm imprime correctamente los abonos acumulados y el saldo pendiente.
* [ ] **Auditoría:** Cada abono o modificación guarda explícitamente el `user_id` del operador que realizó la acción.
