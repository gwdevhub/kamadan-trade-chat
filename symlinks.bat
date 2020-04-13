if exist ..\GWCA (
  rmdir /S /Q client\Dependencies\GWCA
  mklink /J client\Dependencies\GWCA ..\GWCA
)
if exist ..\GWToolboxpp\Dependencies\imgui (
  rmdir /S /Q client\Dependencies\imgui
  mklink /J client\Dependencies\imgui ..\GWToolboxpp\Dependencies\imgui
)