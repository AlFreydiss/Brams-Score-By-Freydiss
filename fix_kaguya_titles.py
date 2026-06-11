# -*- coding: utf-8 -*-
# Injecte les titres FR des épisodes Kaguya dans src/data/kaguya-videos.json.
# À lancer APRÈS la fin d'upload_kaguya.py (le pipeline réécrit le JSON en cours
# de route et écraserait le patch). Source : MyAnimeList/Jikan, traduction FR.
import json, io

T = {
'kaguya-S01E01': "Je te ferai m'inviter au cinéma / Kaguya veut être arrêtée / Kaguya le veut",
'kaguya-S01E02': "Kaguya veut échanger ses coordonnées / Fujiwara veut sortir / Miyuki Shirogane veut le cacher",
'kaguya-S01E03': "Miyuki Shirogane ne l'a toujours pas fait / Kaguya veut être percée à jour / Kaguya veut marcher",
'kaguya-S01E04': "Kaguya veut de l'affection / Le conseil des élèves veut l'entendre / Kaguya veut qu'il l'envoie / Miyuki Shirogane veut parler",
'kaguya-S01E05': "Kaguya veut s'en charger / Miyuki Shirogane veut frimer / Kaguya veut être couverte",
'kaguya-S01E06': "Yu Ishigami veut vivre / Chika Fujiwara veut te tester / Kaguya veut être remarquée",
'kaguya-S01E07': "Miyuki Shirogane veut travailler / Kaguya veut qu'il se joigne à eux / Kaguya veut le contrôler",
'kaguya-S01E08': "Kaguya veut le lui faire dire / Miyuki Shirogane ne peut pas perdre / Yu Ishigami ferme les yeux",
'kaguya-S01E09': "Kaguya veut offrir un cadeau / Chika Fujiwara veut rendre visite / À propos de Kaguya Shinomiya, partie 1",
'kaguya-S01E10': "Kaguya ne pardonnera pas / Kaguya veut pardonner / Miyuki Shirogane veut aller quelque part",
'kaguya-S01E11': "Ai Hayasaka veut se faire tremper / Chika Fujiwara veut vraiment le manger / Miyuki Shirogane veut te voir / Je n'entends pas les feux d'artifice, partie 1",
'kaguya-S01E12': "Je n'entends pas les feux d'artifice, partie 2 / Kaguya ne veut pas l'éviter",
'kaguya-S02E01': "Ai Hayasaka veut les repousser / Le conseil des élèves n'a pas atteint le nirvana / Kaguya veut se marier / Kaguya veut fêter ça",
'kaguya-S02E02': "Kaguya veut savoir / Kaguya veut offrir un cadeau / Chika Fujiwara veut vérifier",
'kaguya-S02E03': "Miyuki Shirogane veut contempler la lune / Le 67e conseil des élèves / Kaguya ne veut pas le dire",
'kaguya-S02E04': "Ai Hayasaka veut le faire tomber amoureux / Kaguya veut qu'on se déclare à elle / Miko Iino veut remettre de l'ordre",
'kaguya-S02E05': "Miyuki Shirogane veut faire chavirer les filles / Nagisa Kashiwagi veut consoler / Miyuki Shirogane veut chanter / Kaguya veut les faire tomber",
'kaguya-S02E06': "Je ne veux pas faire sourire Miko Iino / Je veux faire sourire Miko Iino / Kaguya n'est pas appelée",
'kaguya-S02E07': "Kaguya veut le déshabiller / Kaguya veut qu'il lâche prise / Miyuki Shirogane veut la faire lire / Kaguya aime l'aquarium",
'kaguya-S02E08': "Miko Iino veut se contrôler / Kaguya n'a pas froid aux yeux / Kaguya veut être examinée",
'kaguya-S02E09': "Yu Ishigami ferme les yeux, partie 2 / Kaguya veut toucher / Kaguya ne dit pas non",
'kaguya-S02E10': "Kei Shirogane ne peut pas parler / Miyuki Shirogane veut danser / Kobachi Osaragi veut sévir / Le père de Miyuki Shirogane veut savoir",
'kaguya-S02E11': "Yu Ishigami ferme les yeux, partie 3 / Miyuki Shirogane et Yu Ishigami / Kyoko Otomo ne se rend compte de rien",
'kaguya-S02E12': "Le conseil des élèves voudrait une photo de groupe / Le conseil des élèves aura cette photo / Chika Fujiwara veut gonfler",
'kaguya-S03E01': "Miko Iino veut être réconfortée / Kaguya ne se rend pas compte / Chika Fujiwara veut se battre",
'kaguya-S03E02': "Miyuki Shirogane veut arbitrer / Kaguya veut le distraire / Kaguya frappe la première",
'kaguya-S03E03': "Nagisa Kashiwagi veut tuer / Maki Shijo veut passer à l'action / Miyuki Shirogane veut qu'on le croie",
'kaguya-S03E04': "L'exigence impossible de Kaguya : « le coquillage de l'hirondelle », partie 1 / Yu Ishigami veut prouver sa valeur / Chika Fujiwara veut dormir sur place",
'kaguya-S03E05': "Chika Fujiwara veut battre la mesure / Ai Hayasaka veut parler / Maki Shijo a besoin d'aide",
'kaguya-S03E06': "Le conseil des élèves veut avancer / Miyuki Shirogane veut la faire se déclarer, parties 2 et 3",
'kaguya-S03E07': "Miko Iino ne peut pas aimer, partie 1 / Les élèves veulent discuter du festival culturel / Miyuki Shirogane veut tout faire exploser",
'kaguya-S03E08': "Kei Shirogane veut frimer / À propos de Kaguya Shinomiya, partie 2 / Kaguya veut se déclarer",
'kaguya-S03E09': "Le printemps de la première année / Le festival culturel de Kaguya / Le festival culturel de Yu Ishigami",
'kaguya-S03E10': "Kozue Makihara veut s'amuser / Chika Fujiwara veut démasquer / Le festival culturel de Miyuki Shirogane",
'kaguya-S03E11': "Miyuki Shirogane veut la faire se déclarer, partie 4 / Tsubame Koyasu veut dire non / partie 5",
'kaguya-S03E12': "Kaguya veut se déclarer, parties 2 et 3 / Double déclaration, partie 1",
'kaguya-S03E13': "Double déclaration, partie 2 / L'after de Shuchiin",
}

path = r"F:\brams-web-test\src\data\kaguya-videos.json"
with io.open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

patched = 0
for entry in data:
    k = entry.get("progressKey")
    if k in T:
        entry["title"] = T[k]
        patched += 1

with io.open(path, "w", encoding="utf-8", newline="\n") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write("\n")

print(f"OK: {patched}/{len(T)} titres patches ({len(data)} entrees)")
