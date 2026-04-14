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

export default async function TermsPage() {
  return (
    <StaticPageLayout>
      <div className="border-b px-10 py-8">
        <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">
          Conditions Générales d&apos;Utilisation
        </h1>
      </div>
      <div className="px-10 py-8">
        <div className="space-y-8 text-muted-foreground text-sm leading-relaxed sm:text-base">
          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 1. Définitions
            </h2>
            <p>
              <strong>NoeticSearch</strong> : désigne la plateforme en ligne
              hébergée à l&apos;adresse <PlatformLink /> et permettant
              l&apos;annotation collaborative de vidéos à des fins pédagogiques.
            </p>
            <p>
              <strong>Vous</strong> : désigne le créateur d&apos;un projet
              utilisant la plateforme NoeticSearch, cosignataire des CGU.
            </p>
            <p>
              <strong>Conditions Générales d&apos;Utilisation (CGU)</strong> :
              désignent le présent contrat conclu entre NoeticSearch et Vous,
              permettant d&apos;utiliser la Plateforme NoeticSearch.
            </p>
            <p>
              <strong>Plateforme</strong> : renvoie aux fonctionnalités fournies
              depuis le site internet <PlatformLink />
            </p>
            <p>
              <strong>Contenu(s)</strong> : désigne(nt) les créations et
              interactions que des tiers ou Vous avez mises en ligne sur la
              plateforme internet <PlatformLink />
            </p>
            <p>
              <strong>Partenaire(s)</strong> : désigne(nt) les centres de
              formation, les entreprises et les associations participant dans le
              cadre de NoeticSearch.
            </p>
            <p>
              <strong>Profil utilisateur</strong> : renvoie aux informations que
              Vous avez remplies dans le cadre de l&apos;utilisation de la
              Plateforme.
            </p>
            <p>
              <strong>Projet</strong> : désigne les idées, les prototypes ou
              tous types de créations intellectuelles auxquelles vous contribuez
              dans le cadre de NoeticSearch.
            </p>
            <p>
              <strong>Projet Partenaire</strong> : désigne un projet, porté par
              un Partenaire, qui vous est proposé.
            </p>
            <p>
              <strong>Communauté</strong> : désigne le groupe dans lequel Vous
              contribuez pour réaliser le Projet.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 2. Objet
            </h2>
            <p>
              Les CGU ont pour objet de définir les modalités et conditions
              d&apos;utilisation de la Plateforme, ainsi que de définir Vos
              droits et obligations quant aux informations et Contenus placés
              sur la Plateforme.
            </p>
            <p>
              Les CGU sont notamment accessibles et imprimables à tout moment
              par un lien direct en bas de la page d&apos;accueil du site
              internet <PlatformLink />.
            </p>
            <p>
              Les CGU peuvent être complétées, le cas échéant, par des
              conditions d&apos;utilisation particulières à certains Projets
              Partenaires. En cas de contradiction, les conditions particulières
              instaurées lors de ces Projets Partenaires par les Partenaires
              prévalent sur les CGU.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 3. Accès au site et aux Services
            </h2>
            <p>
              Les Services sont accessibles, sous réserve des restrictions
              prévues sur le site à toute personne physique disposant de la
              pleine capacité juridique pour s&apos;engager au titre des CGU. La
              personne physique qui ne dispose pas de la pleine capacité
              juridique ne peut accéder au Site et aux Services qu&apos;avec
              l&apos;accord de son représentant légal.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 4. Acceptation des conditions générales
            </h2>
            <p>
              L&apos;acceptation des CGU est matérialisée par une case à cocher
              dans le formulaire d&apos;inscription. Cette acceptation ne peut
              être que pleine et entière. Toute adhésion sous réserve est
              considérée comme nulle et non avenue. La Plateforme ne vous sera
              accessible qu&apos;uniquement dans l&apos;hypothèse de votre
              acceptation des CGU.
            </p>
            <p>
              L&apos;utilisation de la Plateforme nécessite Votre inscription
              dans le formulaire prévu à cet effet. Ce formulaire est disponible
              sur la Plateforme. Vous êtes prié(e) de fournir toutes les
              informations requises comme obligatoires. Toute inscription
              incomplète ne sera pas validée. Suite à cette inscription, Votre
              compte utilisateur sera créé, vous permettant d&apos;accéder à un
              espace personnel.
            </p>
            <p>
              Vous garantissez que toutes les informations inscrites dans le
              formulaire, mentionné ci-dessus, sont exactes, à jour et sincères
              et ne sont entachées d&apos;aucun caractère trompeur. Dans la
              mesure du possible, vous vous engagez à mettre à jour ces
              informations depuis votre espace personnel, afin que ces
              informations soient toujours à jour.
            </p>
            <p>
              Vous êtes explicitement informé(e) et Vous acceptez que les
              informations saisies aux fins de création ou de mise à jour de
              Votre compte utilisateur vaillent preuve de Votre identité. Les
              informations saisies par l&apos;utilisateur l&apos;engagent dès
              leur validation.
            </p>
            <p>
              Après identification grâce à votre identifiant de connexion
              combiné avec votre mot de passe, Vous pouvez accéder à tout moment
              à Votre espace personnel.
            </p>
            <p>
              Vous vous engagez à utiliser personnellement la Plateforme et à ne
              permettre à aucun tiers de les utiliser à Votre place ou pour
              Votre compte, sauf à en supporter l&apos;entière responsabilité
              d&apos;une utilisation illicite ou contraire aux CGU.
            </p>
            <p>
              Vous êtes totalement responsable du maintien de la confidentialité
              de Votre identifiant et de Votre mot de passe.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 5. Services gratuits
            </h2>
            <p>La Plateforme vous est fournie à titre gratuit.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 6. Données
            </h2>
            <p>
              Sous réserve des dispositions prévues à l&apos;article 13 (données
              personnelles) et de la Charte de Confidentialité, Vous
              reconnaissez et acceptez expressément que les données recueillies
              par la Plateforme et sur les équipements informatiques de
              NoeticSearch font foi de la réalité des opérations intervenues
              dans le cadre de Votre utilisation de la Plateforme.
            </p>
            <p>
              Ces données vous seront accessibles depuis l&apos;espace
              personnel.
            </p>
            <p>
              Toutefois, et en conformité avec la loi, NoeticSearch est tenu de
              garder pendant une période de 5 ans ces données à des fins de
              preuves judiciaires. Ces données ne seront remises qu&apos;après
              la production d&apos;une mesure d&apos;instruction délivrée par
              une autorité judiciaire compétente.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 7. Vos Obligations
            </h2>
            <p>
              Sans préjudice des autres obligations prévues aux présentes, Vous
              vous engagez à respecter les obligations suivantes :
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                À respecter les lois et règlements en vigueur et à ne pas porter
                atteinte aux droits de tiers ou à l&apos;ordre public.
              </li>
              <li>
                À avoir pris connaissance sur la Plateforme des caractéristiques
                et contraintes, notamment techniques, de l&apos;ensemble des
                fonctionnalités. Vous êtes seul(e) responsable de Votre
                utilisation.
              </li>
              <li>
                D&apos;être informé(e) et d&apos;accepter que la mise en œuvre
                de la Plateforme nécessite la connexion à internet et que la
                qualité de la Plateforme dépend directement de cette connexion,
                dont Vous êtes seul(e) responsable.
              </li>
              <li>
                D&apos;être seul(e) responsable des relations nouées avec les
                utilisateurs tiers de la Plateforme et des informations
                communiquées sur la Plateforme. Vous devez exercer une prudence
                et un discernement appropriés dans ces relations et
                communications. De surcroît, Vous vous engagez à respecter les
                règles usuelles de politesse et de courtoisie.
              </li>
              <li>
                À ne faire qu&apos;un usage strictement personnel de la
                Plateforme. Ainsi Vous vous interdisez en conséquence de céder,
                concéder ou transférer tout ou partie de Vos droits ou
                obligations au titre des CGU à un tiers, de quelque manière que
                ce soit.
              </li>
              <li>
                À fournir à NoeticSearch toutes les informations nécessaires à
                la bonne exécution de la Plateforme et à coopérer activement
                avec NoeticSearch en vue de la bonne exécution des CGU.
              </li>
              <li>
                À être seul(e) responsable des Contenus de toute nature
                (rédactionnels, graphiques, audiovisuels ou autres, en ce
                compris la dénomination et/ou l&apos;image éventuellement
                choisies par l&apos;Utilisateur pour l&apos;identifier sur le
                site) diffusés sur la Plateforme.
              </li>
              <li>
                À garantir à NoeticSearch de disposer l&apos;autorisation de la
                diffusion de ces Contenus.
              </li>
              <li>
                À ce que les Contenus soient licites, ne portent pas atteinte à
                l&apos;ordre public, aux bonnes mœurs ou aux droits de tiers,
                n&apos;enfreignent aucune disposition législative ou
                règlementaire et plus généralement, ne soient aucunement
                susceptibles de mettre en jeu la responsabilité civile ou pénale
                de NoeticSearch.
              </li>
            </ul>
            <p>
              Sans que cette liste soit exhaustive, Vous vous engagez à ne pas
              diffuser :
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Des Contenus pornographiques, obscènes, indécents, choquants ou
                inadaptés à un public familial, diffamatoires, injurieux,
                violents, racistes, xénophobes ou révisionnistes.
              </li>
              <li>Des Contenus contrefaisants.</li>
              <li>
                Des Contenus attentatoires à l&apos;image d&apos;un tiers.
              </li>
              <li>
                Des Contenus mensongers, trompeurs ou proposant ou promouvant
                des activités illicites, frauduleuses ou trompeuses.
              </li>
              <li>
                Des Contenus nuisibles aux systèmes informatiques de tiers (tels
                que virus, vers, chevaux de Troie...).
              </li>
              <li>
                Et plus généralement des Contenus susceptibles de porter
                atteinte aux droits de tiers ou d&apos;être préjudiciables à des
                tiers, de quelque manière et sous quelque forme que ce soit.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 8. Vos Garanties
            </h2>
            <p>
              Vous garantissez NoeticSearch contre toutes plaintes,
              réclamations, actions et/ou revendications quelconques que
              NoeticSearch pourrait subir du fait d&apos;une violation de
              l&apos;une quelconque de ses obligations ou garanties aux termes
              des CGU que vous auriez occasionnée.
            </p>
            <p>
              Vous vous engagez à indemniser NoeticSearch de tout préjudice subi
              et à lui payer tous les frais, charges et/ou condamnations que
              NoeticSearch aurait à supporter de ce fait.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 9. Comportements prohibés
            </h2>
            <p>
              Il est strictement interdit d&apos;utiliser la Plateforme aux fins
              suivantes :
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                L&apos;exercice d&apos;activités illégales, frauduleuses ou
                portant atteinte aux droits ou à la sécurité des tiers.
              </li>
              <li>
                L&apos;atteinte à l&apos;ordre public ou la violation des lois
                et règlements en vigueur.
              </li>
              <li>
                L&apos;intrusion dans le système informatique d&apos;un tiers ou
                toute activité de nature à nuire, contrôler, interférer, ou
                intercepter tout ou partie du système informatique d&apos;un
                tiers, en violer l&apos;intégrité ou la sécurité.
              </li>
              <li>
                L&apos;envoi d&apos;emails non sollicités et/ou de prospection
                ou sollicitation commerciale.
              </li>
              <li>
                Les manipulations destinées à améliorer le référencement
                d&apos;un site tiers.
              </li>
              <li>
                L&apos;aide ou l&apos;incitation, sous quelque forme et de
                quelque manière que ce soit, à un ou plusieurs des actes et
                activités décrits ci-dessus.
              </li>
              <li>
                Et plus généralement toute pratique détournant les Services à
                des fins autres que celles pour lesquelles ils ont été conçus.
              </li>
            </ul>
            <p>
              Sont également strictement interdits : (i) tous comportements de
              nature à interrompre, suspendre, ralentir ou empêcher la
              continuité des Services, (ii) toutes intrusions ou tentatives
              d&apos;intrusions dans les systèmes de NoeticSearch, (iii) tous
              détournements des ressources système du site, (iv) toutes actions
              de nature à imposer une charge disproportionnée sur les
              infrastructures de ce dernier, (v) toutes atteintes aux mesures de
              sécurité et d&apos;authentification, (vi) tous actes de nature à
              porter atteinte aux droits et intérêts financiers, commerciaux ou
              moraux de NoeticSearch ou des usagers de son site, et enfin plus
              généralement (vii) tout manquement aux présentes conditions
              générales.
            </p>
            <p>
              Il est strictement interdit de monnayer, vendre ou concéder tout
              ou partie de l&apos;accès aux Services ou au site, ainsi
              qu&apos;aux informations qui y sont hébergées et/ou partagées.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 10. Sanctions des manquements
            </h2>
            <p>
              En cas de manquement à l&apos;une quelconque des dispositions des
              CGU ou plus généralement, d&apos;infraction aux lois et règlements
              en vigueur, NoeticSearch se réserve le droit de prendre toute
              mesure appropriée et notamment de : (i) suspendre ou résilier
              Votre accès à la Plateforme, (ii) supprimer tout Contenu mis en
              ligne sur la Plateforme, (iii) publier sur le site tout message
              d&apos;information que NoeticSearch jugera utile, (iv) avertir
              toute autorité concernée, (v) engager toute action judiciaire.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 11. Responsabilité et garantie de NoeticSearch
            </h2>
            <p>
              NoeticSearch s&apos;engage à fournir la Plateforme avec diligence
              et selon les règles de l&apos;art, étant précisé qu&apos;il pèse
              sur elle une obligation de moyens, à l&apos;exclusion de toute
              obligation de résultat, ce que Vous reconnaissez et acceptez
              expressément.
            </p>
            <p>
              NoeticSearch n&apos;a pas de connaissance préalable des Contenus
              que Vous mettez en ligne dans le cadre de l&apos;utilisation de la
              Plateforme, sur lesquels elle n&apos;effectue aucune modération,
              sélection, vérification ou contrôle d&apos;aucune sorte et à
              l&apos;égard desquels elle n&apos;intervient qu&apos;en tant que
              prestataire d&apos;hébergement.
            </p>
            <p>
              En conséquence, NoeticSearch ne peut être tenue pour responsable
              des Contenus, dont les auteurs sont des tiers, toute réclamation
              éventuelle devant être dirigée en premier lieu vers l&apos;auteur
              des Contenus en question.
            </p>
            <p>
              Les Contenus préjudiciables à un tiers peuvent faire l&apos;objet
              d&apos;une notification à NoeticSearch selon les modalités prévues
              par l&apos;article 6 I 5 de la loi n° 2004-575 du 21 juin 2004
              pour la confiance dans l&apos;économie numérique.
            </p>
            <p>
              NoeticSearch s&apos;engage à procéder régulièrement à des
              contrôles afin de vérifier le fonctionnement et
              l&apos;accessibilité de la Plateforme. A ce titre, NoeticSearch se
              réserve la faculté d&apos;interrompre momentanément l&apos;accès à
              la Plateforme pour des raisons de maintenance. De même,
              NoeticSearch ne saurait être tenue responsable des difficultés ou
              impossibilités momentanées d&apos;accès à la Plateforme qui
              auraient pour origine des circonstances qui lui sont extérieures,
              la force majeure, ou encore qui seraient dues à des perturbations
              des réseaux de télécommunication.
            </p>
            <p>
              NoeticSearch ne Vous garantit pas (i) que la Plateforme, soumise à
              une recherche constante pour en améliorer notamment la performance
              et l&apos;efficacité, sera totalement exempte d&apos;erreurs, de
              vices ou défauts, (ii) que la Plateforme, étant standard et
              nullement proposée à votre seule intention en fonction de vos
              propres contraintes personnelles, répondra spécifiquement à vos
              besoins et attentes.
            </p>
            <p>
              En tout état de cause, la responsabilité susceptible d&apos;être
              encourue par NoeticSearch au titre des présentes est expressément
              limitée à vos seuls dommages directs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 12. Propriété intellectuelle
            </h2>
            <p>
              Les systèmes, logiciels, structures, infrastructures, bases de
              données et contenus de toute nature (textes, images, visuels,
              musiques, logos, marques, base de données...) exploités par
              NoeticSearch au sein du site sont protégés par tous droits de
              propriété intellectuelle ou droits des producteurs de bases de
              données en vigueur. Le code source de la Plateforme NoeticSearch
              est disponible à l&apos;adresse suivante :
              github.com/NoeticSearch.edu
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 13. Données à caractère personnel
            </h2>
            <p>
              NoeticSearch pratique une politique de protection des données
              personnelles dont les caractéristiques sont explicitées dans le
              document intitulé « Charte de confidentialité », dont Vous êtes
              expressément invité(e) à prendre connaissance sur la Plateforme.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 14. Liens et sites tiers
            </h2>
            <p>
              NoeticSearch ne pourra en aucun cas être tenue pour responsable de
              la disponibilité technique de sites internet ou
              d&apos;applications mobiles exploités par des tiers (y compris ses
              éventuels partenaires) auxquels vous pourrez accéder par
              l&apos;intermédiaire de la Plateforme.
            </p>
            <p>
              NoeticSearch n&apos;endosse aucune responsabilité au titre des
              contenus, publicités, produits et/ou services disponibles sur de
              tels sites et applications mobiles tiers dont il est rappelé
              qu&apos;ils sont régis par leurs propres conditions
              d&apos;utilisation.
            </p>
            <p>
              NoeticSearch ne peut être tenu pour responsable des transactions
              intervenues entre un quelconque annonceur, professionnel ou
              commerçant (y compris ses éventuels partenaires) et Vous-même,
              même si Vous seriez orienté par l&apos;intermédiaire du site et ne
              saurait en aucun cas être partie à quelques litiges éventuels que
              ce soit avec ces tiers concernant notamment la livraison de
              produits et/ou services, les garanties, déclarations et autres
              obligations quelconques auxquelles ces tiers sont tenus.
            </p>
            <p>
              Dans l&apos;hypothèse d&apos;un signalement fait par un
              Utilisateur ou par un tiers, d&apos;une violation d&apos;un droit
              d&apos;auteur ou des CGU, NoeticSearch peut retirer sans préavis
              un Contenu que vous auriez posté.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 15. Durée, désinscription
            </h2>
            <p>
              Votre inscription à la Plateforme est pour la durée du projet que
              vous menez dans le cadre de NoeticSearch. Votre déchéance de
              personnel de structures Partenaires entraîne la résiliation
              automatique de votre Compte Utilisateur.
            </p>
            <p>
              Vous pouvez vous désinscrire de la Plateforme à tout moment, en
              adressant une demande à cet effet à NoeticSearch par email, aux
              coordonnées mentionnées à l&apos;article 2.
            </p>
            <p>
              La désinscription est effective immédiatement. Elle entraîne la
              suppression automatique du Compte de l&apos;Utilisateur.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 16. Modifications
            </h2>
            <p>
              NoeticSearch se réserve la faculté de modifier à tout moment les
              CGU en vous en informant par tout moyen utile. Toute utilisation
              faite après la modification des CGU entraîne la présomption de
              Votre acceptation de ces modifications.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 17. Langue
            </h2>
            <p>
              Dans l&apos;hypothèse d&apos;une traduction des présentes CGU dans
              une ou plusieurs langues, la langue d&apos;interprétation sera la
              langue française en cas de contradiction ou de contestation sur la
              signification d&apos;un terme ou d&apos;une disposition.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-foreground text-lg">
              Article 18. Loi applicable et juridiction
            </h2>
            <p>Les CGU sont régies par la loi française.</p>
            <p>
              En cas de contestation sur la validité, l&apos;interprétation
              et/ou l&apos;exécution des présentes conditions générales, les
              parties conviennent que les tribunaux de Paris seront
              exclusivement compétents pour en juger, sauf règles de procédure
              impératives contraires.
            </p>
          </section>

          <footer className="border-t pt-6 text-muted-foreground text-xs">
            <p>CC BY-NC 2026 Consortium Canevas</p>
          </footer>
        </div>
      </div>
    </StaticPageLayout>
  );
}
