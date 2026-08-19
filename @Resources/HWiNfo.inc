;///////////////////////////////////////////////////////////////////////////////////////////////////
; HWiNFO (VSB) índices → variables para COMBINADO/*.ini
; Propósito: centralizar mapeos y permitir ajustes sin tocar los .ini
; Fuente: HWiNFOIndexList.txt (este skin)
; Actualizado: 2026-04-15 (Tras añadir hilos T0..T15)
;///////////////////////////////////////////////////////////////////////////////////////////////////

[Variables]

; Registry base para VSB de HWiNFO
HWi_Reg_Hive=HKEY_CURRENT_USER
HWi_Reg_Base=SOFTWARE\HWiNFO64\VSB


; === GPU Sensors ===
; Uso GPU D3D (%)
HWiNFO_GPU_USAGE=25
; Temperatura GPU (°C)
HWiNFO_GPU_TEMP=20
; Relojes GPU (MHz)
HWiNFO_GPU_CLOCK=23
HWiNFO_GPU_VRAM_CLOCK=24
; Voltaje núcleo GPU (V)
HWiNFO_GPU_VCORE=21
; Ventilador GPU (RPM)
HWiNFO_GPU_FANRPM=22
; VRAM (MB)
HWiNFO_GPU_VRAM_DEDICATED_USED=29
HWiNFO_GPU_VRAM_USED=28
HWiNFO_GPU_VRAM_AVAILIABLE=27

; === CPU Sensors ===
; Temperatura CPU (Tctl/Tdie)
HWiNFO_CPU_TEMP=19
; Voltaje CPU (V)
HWiNFO_CPU_VCORE=
; Ventilador CPU (RPM)
HWiNFO_CPU_FAN=

; Índices de Hilos (T0..T15)
; Mapeo corecto según lista de hilos inicial
HWiNFO_CPU_T0=0
HWiNFO_CPU_T1=1
HWiNFO_CPU_T2=2
HWiNFO_CPU_T3=3
HWiNFO_CPU_T4=4
HWiNFO_CPU_T5=5
HWiNFO_CPU_T6=6
HWiNFO_CPU_T7=7
HWiNFO_CPU_T8=8
HWiNFO_CPU_T9=9
HWiNFO_CPU_T10=10
HWiNFO_CPU_T11=11
HWiNFO_CPU_T12=12
HWiNFO_CPU_T13=13
HWiNFO_CPU_T14=14
HWiNFO_CPU_T15=15