<# 
.SYNOPSIS
    Rollback del módulo Avatar - Revertir todos los cambios
.DESCRIPTION
    Elimina completamente el módulo Avatar y restaura el estado anterior
.EXAMPLE
    .\rollback-modulo-avatar.ps1
#>

param()

Write-Host "🔄 Iniciando rollback del módulo Avatar..." -ForegroundColor Cyan

# 1. Restaurar archivos modificados desde git
Write-Host "📦 Restaurando archivos desde git..." -ForegroundColor Yellow
git checkout -- src/App.tsx 2>$null
git checkout -- src/types.ts 2>$null
git checkout -- api/index.ts 2>$null
git checkout -- package.json 2>$null
git checkout -- vite.config.ts 2>$null

# 2. Eliminar archivos nuevos del módulo Avatar
Write-Host "🗑️  Eliminando archivos nuevos del módulo Avatar..." -ForegroundColor Yellow
Remove-Item -Path "src/components/AvatarChat.tsx" -ErrorAction SilentlyContinue
Remove-Item -Path "src/components/AvatarSelector.tsx" -ErrorAction SilentlyContinue
Remove-Item -Path "src/hooks/useAvatar.ts" -ErrorAction SilentlyContinue
Remove-Item -Path "src/lib/avatar.ts" -ErrorAction SilentlyContinue
Remove-Item -Path "public/vrm" -Recurse -Force -ErrorAction SilentlyContinue

# 3. Eliminar dependencias añadidas para Three.js/VRM
Write-Host "📦 Eliminando dependencias de Three.js/VRM..." -ForegroundColor Yellow
npm uninstall three @pixiv/three-vrm @types/three 2>$null

# 4. Limpiar node_modules y reinstalar dependencias originales
Write-Host "🧹 Limpiando node_modules..." -ForegroundColor Yellow
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
npm install

# 5. Verificar que la app sigue funcionando
Write-Host "✅ Verificando build..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "✅ Rollback completado. El módulo Avatar ha sido eliminado por completo." -ForegroundColor Green
Write-Host "   La aplicación está en el estado previo a la implementación." -ForegroundColor Green