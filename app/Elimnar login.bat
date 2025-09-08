# Ruta base del proyecto
$basePath = "C:\GYM\app"

# Carpetas de login a eliminar
$folders = @(
    "$basePath\(auth)\admin-login",
    "$basePath\login"
)

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Write-Host "Eliminando carpeta: $folder"
        Remove-Item -Path $folder -Recurse -Force
    } else {
        Write-Host "No existe la carpeta: $folder"
    }
}

Write-Host "✅ Carpetas de login eliminadas. Listo para crear nuevo flujo."