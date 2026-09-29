# decodeZCL

> [!WARNING]
> **Deprecated — basic decoding template.** This project provides a basic decoding template for only some standard frames from Watteco devices, with very few integrity checks. It is not exhaustive.
>
> For new integrations, use **[Watteco/Codec-API-LoRaWAN](https://github.com/Watteco/Codec-API-LoRaWAN)** instead.
>
> **Obsolète — modèle de décodage basique.** Ce projet fournit un modèle de décodage basique pour certaines trames standard des équipements Watteco uniquement, avec très peu de contrôles d'intégrité. Il n'est pas exhaustif.
>
> Pour toute nouvelle intégration, privilégiez **[Watteco/Codec-API-LoRaWAN](https://github.com/Watteco/Codec-API-LoRaWAN)**.

English
-------------
-------------

A command line script to decode a ZCL payload at a given port.

Pre-requirements
-------------

Install nodejs (LTS version) on your device.

Use
------------
Run the script with the port, and the payload.

Example:
 
     node decodeZCL.js 125 110A04020000290998
     
     node decodeZCL.js 125 1101800F80000041170064271080031B5800A000A00136000003E84E20901407


Note
------------
decodeZCLAvecTIC.js Should only be used in case of frame comming from TICs'O sensor connected to French Electrical  Meter (ENEDIS)

Francais
-------------
-------------

Un script en ligne de commande pour décoder une trame ZCL sur un port donné.

Pre-requirements
-------------

Installer nodejs (la LTS par exemple) sur votre appareil.

Utilisation
------------
Lancer le script avec le port et votre trame.

Example:
 
     node decodeZCL.js 125 110A04020000290998
     
     node decodeZCL.js 125 1101800F80000041170064271080031B5800A000A00136000003E84E20901407

Note
------------
decodeZCLAvecTIC.js peut être utilisé à la place de decodeZCL.js en cas de trame provenant de TICs'O connectées à un compteur électrique ENEDIS
