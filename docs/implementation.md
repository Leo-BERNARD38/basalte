# Implémentation

## Ordre

Chaque étape produit quelque chose de démontrable.

1. Squelette du socle : intégration Astro, `defineSite`, tokens CSS, un bloc
   `hero`, rendu statique, script `prepare` → un premier site s'affiche.
2. DSL de champs, validation, `basalte check`, `basalte inventory`.
3. Blocs de référence et helpers SEO.
4. Authentification du panel — morceau critique, isolé et testable seul.
5. Panel : génération des formulaires, enregistrement, commit.
6. Médias : téléversement, traitement, médiathèque, point focal.
7. Réordonnancement, `hidden`, langues en préparation, preview.
8. Pipeline de publication : bascule atomique, file d'attente, push, gestion
   d'échec.
9. Formulaire de contact, Brevo, stockage, purge.
10. Analytics par logs.
11. `basalte init` : dépôt client, paquet Claude Code, Docker Compose.
12. `basalte deploy` et `basalte doctor` — du VPS vide au site en ligne.
13. `basalte update`, migrations, `basalte update-all`.

Rien n'est utilisable par un client avant l'étape 8. Une option à considérer :
faire 1 → 3 puis 11 et 12, mettre un vrai site en ligne que tu édites toi-même
via git, et construire le panel ensuite. L'architecture est validée sur du réel
très tôt, et le panel se construit sans pression.

Les étapes 11 et 12 portent le confort d'usage — paquet Claude Code du dépôt
client, `deploy`, `doctor`. Les repousser en fin de parcours signifie
provisionner à la main jusque-là ; les avancer coûte du temps avant d'avoir
quoi que ce soit à déployer.

## Tests

Deux endroits seulement, écrits en même temps que le code qu'ils couvrent :

- **l'authentification** (étape 4) — le seul endroit où un bug se traduit par
  une intrusion
- **le DSL de champs** (étape 2) — tout le reste en dépend

Le reste est couvert par `basalte check` sur le site de démonstration et par le
diff du HTML produit : sur un correctif, un diff vide prouve l'absence de
régression.

`basalte check` **n'est pas un test d'intégration** : il valide des contenus
contre des schémas. Il ne touche ni à l'authentification, ni au traitement
d'images, ni à la bascule atomique.

## Blocs de référence

Les blocs livrés par le socle ne sont pas un catalogue de sections : chaque
client aura les siennes, sur mesure. Ce sont des **exemples de référence**,
choisis pour la mécanique que chacun démontre.

| Bloc | Ce qu'il démontre |
|---|---|
| `hero` | texte traduisible, image, point focal, bouton |
| `richtext` | Markdown restreint et son assainissement |
| `features` | une liste répétable (`f.list`) |
| `gallery` | plusieurs images, `srcset` |
| `faq` | accordéon — le seul bloc avec du JS opt-in — et JSON-LD |
| `contact` | branchement à l'endpoint serveur |

Six blocs, et toutes les mécaniques du socle sont couvertes au moins une fois.
`testimonials`, `logos` ou `stats` sont des `features` habillés autrement :
ils n'enseignent rien de neuf, donc ils relèvent du sur-mesure client.

Plus deux éléments de site configurés hors flux de blocs : `header`
(navigation) et `footer`.

## Hors périmètre

Blog et collections répétées · création de pages par le client · ajout de blocs
par le client · éditeur visuel WYSIWYG · back-office multi-sites · commerce ·
comptes multiples avec rôles différenciés (un seul niveau : éditeur).

Ces exclusions sont des choix de v1, pas des impossibilités : le modèle de
contenu les accueille sans réécriture.

## Points ouverts

| Sujet | Question |
|---|---|
| Auto-déploiement | Le panel construit et bascule lui-même sur sa machine. Reste à décider s'il existe un second déclencheur — webhook après un push depuis ta machine, ou geste manuel en SSH |
| Premier site avant le panel | Livrer un site édité par toi dès l'étape 12, ou attendre l'étape 8 ? |
| Vérification des tokens | `basalte check` refuse les valeurs de style en dur (`design.md`). Reste à décider si la règle porte sur le CSS des blocs seulement, ou aussi sur les composants du panel |
