#!/usr/bin/env python3
"""Lecture des capteurs, formats F1/F2/F3 et campagne de mesure (labo 3).

Sans --host : affichage seul des formats.
Avec --host : envoie --count messages du format choisi au portable et mesure
le RTT de chaque écho avec time.monotonic().
  Wi-Fi     : --host <IP du portable>
  Bluetooth : --liaison bt --host <adresse MAC Bluetooth du portable>
Les pertes et le débit utile sont calculés côté serveur (voir serveur.py).
"""

import argparse
import json
import socket
import statistics
import sys
import time


def encode(message):
    return json.dumps(message, separators=(",", ":"), ensure_ascii=False,
                      allow_nan=False).encode("utf-8")


def formats(cycle, batch, taille_lot=10):
    messages = [
        ("F1", encode({"seq": cycle["sequence"], "ev": cycle["bouton"]})),
        ("F2", encode(cycle)),
    ]
    batch.append(cycle)
    if len(batch) == taille_lot:
        messages.append(("F3", encode(batch)))
        batch.clear()
    return messages


def connecter(liaison, host, port):
    if liaison == "wifi":
        return socket.create_connection((host, port), timeout=5)
    connexion = socket.socket(socket.AF_BLUETOOTH, socket.SOCK_STREAM,
                              socket.BTPROTO_RFCOMM)
    connexion.settimeout(10)
    connexion.connect((host, port))  # port = canal RFCOMM
    return connexion


def ping(connexion, tampon, payload):
    """Envoie un message (terminé par \\n), attend l'écho. Retourne (RTT ms, tampon)."""
    debut = time.monotonic()
    connexion.sendall(payload + b"\n")
    while b"\n" not in tampon:
        morceau = connexion.recv(4096)
        if not morceau:
            raise ConnectionError("Connexion fermée avant la réception de l'écho complet")
        tampon += morceau
    fin = time.monotonic()
    ligne, tampon = tampon.split(b"\n", 1)
    if ligne != payload:
        raise ValueError("L'écho reçu ne correspond pas au message envoyé")
    return (fin - debut) * 1000, tampon


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--format", choices=("F1", "F2", "F3", "all"), default="F2")
    parser.add_argument("--host", help="IP (Wi-Fi) ou adresse MAC (Bluetooth) du portable "
                                       "(sinon affichage seul)")
    parser.add_argument("--liaison", choices=("wifi", "bt"), default="wifi")
    parser.add_argument("--port", type=int,
                        help="Port TCP (défaut 5000) ou canal RFCOMM (défaut 1)")
    parser.add_argument("--count", type=int, default=30, help="Nombre de messages à envoyer (>= 30)")
    parser.add_argument("--interval", type=float, default=2.0,
                        help="Délai entre deux lectures du capteur, en secondes (défaut 2)")
    parser.add_argument("--lot", type=int, default=10,
                        help="Nombre de cycles par message F3 (défaut 10 ; "
                             "20 donne ~2100 octets, assez pour forcer la fragmentation)")
    args = parser.parse_args()
    if args.lot < 1:
        parser.error("Il faut --lot >= 1.")
    if args.port is None:
        args.port = 5000 if args.liaison == "wifi" else 1
    if args.host and args.format == "all":
        parser.error("Avec --host, choisis F1, F2 ou F3 pour une campagne distincte.")
    if args.count < 1 or args.port < 1 or (args.liaison == "wifi" and args.port > 65535):
        parser.error("Il faut --count >= 1 et un port/canal valide.")
    if args.interval <= 0:
        parser.error("Il faut --interval > 0.")

    import RPi.GPIO as GPIO
    import humid

    # Réutilise le pilote DHT11 du labo 2, avec le câblage actuel.
    humid.DHTPIN = 22
    GPIO.setmode(GPIO.BCM)
    batch = []
    sequence = 0
    connexion = None
    tampon = b""
    rtts = []
    try:
        if args.host:
            connexion = connecter(args.liaison, args.host, args.port)
            print(f"Connecté à {args.host} ({args.liaison}, port/canal {args.port})",
                  file=sys.stderr, flush=True)
        GPIO.setup(17, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.setup(27, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.setup(18, GPIO.IN)
        while True:
            result = humid.read_dht11_dat()
            humidity, temperature = result if result else (None, None)
            if not result:
                print("DHT11 : lecture invalide, valeurs null dans le JSON.", file=sys.stderr)
            sequence += 1
            cycle = {
                "sequence": sequence,
                "timestamp": round(time.time(), 3),
                "temperature": temperature,
                "humidite": humidity,
                "bouton": int(GPIO.input(17) == GPIO.LOW),
                "tactile": int(GPIO.input(27) == GPIO.LOW),
                "son": GPIO.input(18),
            }
            for name, payload in formats(cycle, batch, args.lot):
                if args.format in (name, "all"):
                    print(f"{name} : {len(payload)} octets UTF-8 (hors saut de ligne)",
                          file=sys.stderr, flush=True)
                    print(payload.decode("utf-8"), flush=True)
                    if connexion is not None:
                        rtt, tampon = ping(connexion, tampon, payload)
                        rtts.append(rtt)
                        print(f"Écho {len(rtts)}/{args.count} : RTT = {rtt:.3f} ms",
                              file=sys.stderr, flush=True)
            if connexion is not None and len(rtts) == args.count:
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        pass
    finally:
        if connexion is not None:
            connexion.close()
        GPIO.cleanup()
    if rtts:
        print(f"RTT ({len(rtts)} échos complets) en ms : min={min(rtts):.3f}, "
              f"moyenne={statistics.mean(rtts):.3f}, "
              f"médiane={statistics.median(rtts):.3f}, max={max(rtts):.3f}",
              file=sys.stderr)


if __name__ == "__main__":
    main()
