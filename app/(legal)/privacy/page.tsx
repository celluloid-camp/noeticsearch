import Link from "next/link";
import { StaticPageLayout } from "@/components/static-page-layout";

const PLATFORM_URL = "https://noeticsearch.vercel.app";

function PlatformLink() {
  return (
    <Link
      className="text-foreground underline hover:text-foreground/80"
      href={PLATFORM_URL}
      rel="noopener noreferrer"
      target="_blank"
    >
      {PLATFORM_URL}
    </Link>
  );
}

export default async function PrivacyPage() {
  return (
    <StaticPageLayout>
      <div className="border-b px-10 py-8">
        <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">
          Mentions légales et confidentialité
        </h1>
      </div>
      <div className="px-10 py-8">
        <div className="space-y-8 text-muted-foreground text-sm leading-relaxed sm:text-base">
          <section className="space-y-3">
            <p>
              En accédant ou en utilisant le Site Web, <PlatformLink />,
              exploité par l&apos;université Paris8, vous acceptez les termes
              des Règles de confidentialité en ligne présentées ci-après. Si
              vous n&apos;êtes pas d&apos;accord avec ces termes, veuillez ne
              plus utiliser ou accéder à ce site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">Editeur</h2>
            <p>
              Université Paris8
              <br />2 Rue de la Liberté - 93200 Saint-Denis
            </p>
            <p>
              Les informations et documents présentés sur <PlatformLink /> sont
              fournis sans aucune garantie expresse ou tacite ; le site peut
              présenter des erreurs techniques et typographiques ou autres
              inexactitudes, ce que vous reconnaissez et acceptez en utilisant
              le site.
            </p>
            <p>
              L&apos;université Paris8 ne saurait être tenu pour responsable des
              erreurs ou omissions présentées sur son site ou par tout document
              référencé. Les informations contenues dans le site ne sont pas
              contractuelles et sont sujettes à modification sans préavis.
            </p>
            <p>
              Les informations présentées sur le site font régulièrement
              l&apos;objet de mises à jour. Mais en aucune circonstance,
              l&apos;université Paris8 ne sera responsable des préjudices
              fortuits, directs ou indirects résultant de l&apos;utilisation des
              éléments du Site.
            </p>
            <p>
              <strong>Directeurs de la publication :</strong> Anne Alombert,
              Michael Bourgatte et Laurent Tessier
            </p>
            <p>
              <strong>Conception :</strong> Younes Benaomar
            </p>
            <p>
              <strong>Réalisation et hébergement :</strong> Younes Benaomar
            </p>
            <p>
              NoeticSearch est un projet open source, partagé ici :{" "}
              <a
                className="text-foreground underline hover:text-foreground/80"
                href="https://github.com/celluloid-edu"
                rel="noopener noreferrer"
                target="_blank"
              >
                github.com/celluloid-edu
              </a>
              . Les contenus du site internet NoeticSearch ainsi que leur
              structuration en catégories et thématiques font l&apos;objet
              d&apos;une licence MIT.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Protection des données personnelles
            </h2>
            <p>
              Dans certaines fonctionnalités et rubriques proposées sur ce site,
              telles que demande d&apos;information, demande d&apos;inscription,
              vous devez remplir et envoyer un formulaire en ligne. Ces
              activités sont facultatives et n&apos;ont aucun caractère
              obligatoire.
            </p>
            <p>
              Cependant, si vous décidez de participer à l&apos;une d&apos;entre
              elles, NoeticSearch peut vous demander de fournir certaines
              informations telles que vos nom, adresse e-mail et autres données
              d&apos;identification personnelles.
            </p>
            <p>
              Lorsque vous envoyez des informations personnelles à NoeticSearch
              dans le cadre d&apos;une de ces rubriques particulières, vous
              reconnaissez et acceptez le fait que NoeticSearch peut avoir
              besoin, pour la réalisation de l&apos;opération et la mise à jour
              des fichiers associés, de transférer, stocker et traiter ces
              informations.
            </p>
            <p>
              NoeticSearch recueille ces informations afin d&apos;enregistrer et
              de prendre en compte votre participation dans les activités que
              vous avez choisies. Si vous demandez une documentation, par
              exemple, ces informations sont utilisées pour enregistrer vos
              coordonnées afin de pouvoir vous l&apos;envoyer.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Mise à jour de vos informations personnelles
            </h2>
            <p>
              Vous êtes en droit d&apos;accéder et de modifier vos informations
              personnelles et préférences en matière de confidentialité. Pour ce
              faire, envoyez un courrier à l&apos;Université Paris8 à
              l&apos;adresse suivante :
            </p>
            <p>MSH Paris Nord</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Utilisation des &quot;Cookies&quot;
            </h2>
            <p>
              Lorsque vous visitez le site internet NoeticSearch, vous pouvez
              l&apos;explorer de manière anonyme et accéder à des informations
              sans révéler votre identité. Vous restez anonyme sauf si vous avez
              vous-même fourni à NoeticSearch des informations personnelles.
            </p>
            <p>
              Un cookie est un petit volume de données qui est transféré à votre
              navigateur par un serveur Web et qui ne peut être lu que par le
              serveur qui vous l&apos;a envoyé. Il fonctionne comme une carte
              d&apos;identité, en enregistrant vos mots de passe, et
              préférences. Il ne s&apos;agit pas d&apos;un code exécutable et il
              ne peut pas transmettre de virus. Les informations stockées dans
              ce cookie sont cryptées de manière à éviter un usage de votre
              ordinateur à votre insu. NoeticSearch utilise un cookie technique
              qui ne collecte pas les données de navigation. Les cookies
              associés aux vidéos visionnées dans le cadre de NoeticSearch sont
              bloqués.
            </p>
            <p>
              La plupart des navigateurs sont configurés pour accepter les
              cookies. Vous pouvez aussi configurer votre navigateur pour
              qu&apos;il vous signale les cookies qu&apos;il reçoit, vous
              permettant ainsi de les accepter ou de les refuser.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Responsabilité des vidéos et des projets créés dans NoeticSearch
            </h2>
            <p>
              NoeticSearch est un projet à visée pédagogique et scientifique.
              Les projets créés dans NoeticSearch associent un créateur de
              projet (qui peut par exemple être un enseignant) et des
              participants à ce projet (qui peuvent par exemple être ses
              étudiants). Dans tous les cas, l&apos;utilisateur qui crée un
              projet dans NoeticSearch et y associe une vidéo lue depuis un site
              tiers (PeerTube) est responsable du projet et de l&apos;usage de
              la vidéo qui y est faite :
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Il devra s&apos;assurer que les droits d&apos;usage de la vidéo
                utilisée sont acquittés. Dans le cas contraire, il prend le
                risque de voir le projet et la vidéo supprimés, par NoeticSearch
                et/ou par l&apos;hébergeur de la vidéo.
              </li>
              <li>
                Il devra s&apos;assurer que l&apos;ensemble des écrits rédigés
                dans le cadre de son projet (objectifs, consignes, commentaires
                laissés par les participants) sont conformes au droit français.
                Il devra modérer les commentaires laissés par les participants
                et supprimer, le cas échéant, ceux qui porteraient atteinte au
                droit. Dans le cas contraire, et notamment en cas de plainte
                d&apos;un participant, NoeticSearch se réserve le droit de
                supprimer le projet, sans préavis et sans possibilité de recours
                du créateur du projet ni de ses participants.
              </li>
              <li>
                Les vidéos utilisées dans le cadre des projets créés dans
                NoeticSearch sont hébergées par des sites tiers (PeerTube
                notamment). Le contenu de ces vidéos ne saurait engager la
                responsabilité des responsables éditoriaux de NoeticSearch. Pour
                supprimer une vidéo dont le contenu serait inapproprié,
                l&apos;utilisateur devra s&apos;adresser directement à
                l&apos;hébergeur.
              </li>
            </ul>
          </section>

          <footer className="border-t pt-6 text-muted-foreground text-xs">
            <p>CC BY-NC 2023 Consortium Canevas</p>
          </footer>
        </div>
      </div>
    </StaticPageLayout>
  );
}
