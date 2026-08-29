# Implémentation

## Ordre

Chaque étape produit quelque chose de démontrable.

1. Squelette du socle : intégration Astro, `defineSite`, tokens CSS, un bloc
   `hero`, rendu statique → un premier site s'affiche.
2. DSL de champs, validation, `basalte check`.
3. Bibliothèque de blocs v1 et helpers SEO.
4. Authentification du panel — morceau critique, isolé et testable seul.
5. Panel : génération des formulaires, enregistrement, commit.
6. Médias : téléversement, traitement, médiathèque, point focal.
7. Réordonnancement, `hidden`, preview.
8. Pipeline de publication : bascule atomique, file d'attente, gestion d'échec.
9. Formulaire de contact, Brevo, stockage, purge.
10. Analytics par logs.
11. `basalte init`, Docker Compose, provisionnement.
12. Migrations et `basalte update-all`.

## Bibliothèque de blocs v1

À valider — décision de produit, pas d'architecture.

`hero` · `richtext` · `features` (grille 2-4) · `gallery` · `testimonials` ·
`cta` · `faq` (accordéon + JSON-LD) · `logos` · `stats` · `contact`

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
| Reverse proxy | Caddy (acté en D15) ou nginx ? Caddy gère les certificats seul ; nginx demande certbot et une configuration plus longue |
| Blocs v1 | Liste ci-dessus à valider |
