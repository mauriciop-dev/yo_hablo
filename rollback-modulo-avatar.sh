#!/bin/bash
# rollback-modulo-avatar - Revertir todos los cambios del módulo Avatar
# Ejecutar desde la raíz del proyecto: ./rollback-modulo-avatar.sh

set -e

echo "🔄 Iniciando rollback del módulo Avatar..."

# 1. Restaurar archivos modificados desde git
echo "📦 Restaurando archivos desde git..."
git checkout -- src/App.tsx 2>/dev/null || true
git checkout -- src/types.ts 2>/dev/null || true
git checkout -- api/index.ts 2>/dev/null || true
git checkout -- package.json 2>/dev/null || true
git checkout -- vite.config.ts 2>/dev/null || true

# 2. Eliminar archivos nuevos del módulo Avatar
echo "🗑️  Eliminando archivos nuevos del módulo Avatar..."
rm -f src/components/AvatarChat.tsx
rm -f src/components/AvatarSelector.tsx
rm -f src/hooks/useAvatar.ts
rm -f src/lib/avatar.ts
rm -f public/vrm/ 2>/dev/null || true

# 3. Eliminar dependencias añadidas para Three.js/VRM
echo "📦 Eliminando dependencias de Three.js/VRM..."
npm uninstall three @pixiv/three-vrm @types/three 2>/dev/null || true

# 4. Limpiar node_modules y reinstalar dependencias originales
echo "🧹 Limpiando node_modules..."
rm -rf node_modules
rm -f package-lock.json
npm install

# 5. Verificar que la app sigue funcionando
echo "✅ Verificando build..."
npm run build

echo ""
echo "✅ Rollback completado. El módulo Avatar ha sido eliminado por completo."
echo "   La aplicación está en el estado previo a la implementación."