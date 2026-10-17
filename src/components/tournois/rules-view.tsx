import { Link } from "react-router-dom";
import { useTournament } from "./provider";

export function RulesView() {
  const { meta, participants } = useTournament();
  const audio = meta.mode === "audio";
  const source =
    meta.slug === "ost"
      ? "Le son vient du lecteur YouTube officiel, intégré à la page sans son image : seule la photo de l'anime est affichée."
      : meta.slug === "bankai" || meta.slug === "panels"
        ? "Les images viennent des wikis de chaque série."
        : "Les génériques et les clips sont lus depuis les vidéos du site ; quelques titres absents passent par le lecteur YouTube intégré.";

  return (
    <div className="t-page t-rules">
      <h1 className="t-page-title">Règles</h1>
      <p className="t-lead">{meta.lead}</p>

      <section>
        <h2>Le principe</h2>
        <ol>
          <li>
            Tu choisis un format, de {meta.formats[0]} à {meta.formats[meta.formats.length - 1]} {meta.unit}. Ils sont tirés au hasard parmi les {participants.length} du
            catalogue{meta.balanced ? ", moitié rap, moitié OST" : ""}.
          </li>
          <li>Chaque duel oppose deux {meta.unit}. {audio ? "Tu écoutes les deux, puis tu" : "Tu"} choisis : le gagnant passe au tour suivant, l’autre est éliminé.</li>
          <li>Les tours s’enchaînent jusqu’à la finale. Le dernier debout devient ton champion.</li>
        </ol>
      </section>

      {audio ? (
        <section>
          <h2>Écouter</h2>
          <ul>
            <li>Une seule piste joue à la fois : en lancer une met l’autre en pause.</li>
            <li>La barre de lecture suit la vraie position de la piste. Tu peux la déplacer.</li>
            <li>Rien ne démarre tout seul. Dans les paramètres du duel, tu peux demander que la première piste se lance à chaque duel.</li>
            <li>Si une source ne répond pas, la piste est marquée indisponible et tu peux quand même voter.</li>
          </ul>
        </section>
      ) : null}

      <section>
        <h2>Voter</h2>
        <ul>
          <li>Le bouton « {meta.choose} » enregistre ton choix et affiche « Vote enregistré. L&apos;aventure continue. ». Un second clic est ignoré.</li>
          <li>Tu peux annuler ton dernier choix, une seule fois, tant que le duel suivant n&apos;est pas tranché.</li>
          <li>Il n&apos;y a pas d&apos;égalité possible : chaque duel est décidé par ton choix.</li>
          <li>Le cœur ajoute aux favoris. Il ne compte pas comme un vote.</li>
        </ul>
      </section>

      <section>
        <h2>Où sont tes données</h2>
        <p>
          Ta partie, ton historique, tes favoris et ton classement sont rangés dans ce navigateur uniquement. Ils disparaissent si tu effaces les données du site, et
          ne te suivent pas sur un autre appareil. Ce tournoi est donc le tien : rien n&apos;empêche de rejouer une partie autrement.
          {meta.statsId
            ? " Chaque duel joué est aussi compté, sans ton nom, dans les statistiques du site."
            : ""}
        </p>
      </section>

      <section>
        <h2>Sources</h2>
        <p>{source}</p>
      </section>

      <section>
        <h2>Raccourcis clavier</h2>
        <ul className="t-keys-list">
          <li>
            <kbd>←</kbd> <kbd>→</kbd> {audio ? "écouter la piste de gauche ou de droite" : "choisir à gauche ou à droite"}
          </li>
          {audio ? (
            <>
              <li>
                <kbd>Entrée</kbd> choisir la piste sélectionnée
              </li>
              <li>
                <kbd>Espace</kbd> pause ou reprise
              </li>
            </>
          ) : null}
          <li>
            <kbd>F</kbd> ajouter aux favoris, <kbd>T</kbd> ouvrir le tableau, <kbd>Retour arrière</kbd> annuler le dernier choix
          </li>
        </ul>
      </section>

      <Link to={`/tournoi/${meta.path}/duel`} className="t-go">
        Participer au tournoi
      </Link>
    </div>
  );
}
