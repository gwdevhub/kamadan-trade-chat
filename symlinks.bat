if exist ..\GWCA (
  rmdir /S /Q client\Dependencies\GWCA
  mklink /J client\Dependencies\GWCA ..\GWCA
)
if exist ..\imgui (
  rmdir /S /Q client\Dependencies\imgui
  mklink /J client\Dependencies\imgui ..\imgui
)