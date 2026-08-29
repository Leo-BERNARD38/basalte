# Mise en production

## Deux gestes manuels, une commande

Manuels, parce qu'aucun outil ne peut les faire à ta place :

1. commander un VPS — 2 Go de RAM, Ubuntu — et noter son IP
2. faire pointer le domaine du client vers cette IP (enregistrement A)

Puis, depuis ta machine :

```bash
npm run deploy -- --host 51.75.12.34
```

Il n'y a pas de troisième geste, et il n'y a pas de guide. Un guide de
provisionnement n'est jamais à jour, et chaque VPS finit un peu différent —
c'est le défaut même que ce socle corrige.

## Ce que fait `deploy`

En SSH, dans cet ordre :

1. installe `curl` et Docker s'ils sont absents
2. engendre la clé de déploiement de la machine, et l'enregistre sur le dépôt
   quand un `GITHUB_TOKEN` est là — sinon l'affiche, à recopier (D91)
3. clone le dépôt du site, ou le met à jour
4. dépose le `.env` (lu depuis ta machine, poussé par l'entrée standard, jamais
   écrit dans un fichier temporaire)
5. `docker compose up -d --build` — l'application Node et Caddy
6. frappe l'application sur le réseau des conteneurs, jusqu'à ce qu'une version
   soit servie : elle s'ouvre à la première requête et **publie d'elle-même**,
   aucune version n'étant encore là (D88). Jamais par le domaine — ni le
   certificat ni l'enregistrement DNS n'ont à être en place pour un build
7. crée le compte du client et affiche son mot de passe

Chaque étape est idempotente, et la séquence s'arrête à la première qui lâche.

```bash
npm run deploy -- --host 51.75.12.34 --dry-run
```

affiche la séquence, commande par commande, sans qu'une seule connexion ne
parte.

```
  Compte créé : contact@atelier-duvallon.fr
  Mot de passe : Kf7-2mQx-vRd9-Lp

  Affiché une seule fois. Transmets-le de vive voix ou par un canal
  autre que l'email — l'email porte déjà le second facteur.
```

## Elle est idempotente

La même commande, relancée, met la machine à jour : `git pull`, `npm ci`,
rebuild, redémarrage. Elle ne recrée rien de ce qui existe et ne touche jamais
au contenu — celui-ci appartient au panel.

Il n'y a donc qu'une commande à retenir, pour le premier jour comme pour les
suivants.

## Prouver que ça marche

```bash
npm run doctor
```

```
  ✓ site.config.ts — « Atelier Duvallon » sur atelier-duvallon.fr — fr en ligne
  ✓ .env — canal du site — bonjour@atelier-duvallon.fr
  ⚠ canaux email — les codes de connexion partagent la clé du formulaire
      → renseigne AUTH_EMAIL_API_KEY et AUTH_EMAIL_FROM
  ✓ CONTACT_EMAIL — contact@atelier-duvallon.fr
  ✓ EMAIL_ADMIN — leo@exemple.fr
  ✓ email — envoyé à leo@exemple.fr, accepté par brevo
  ✗ DNS — atelier-duvallon.fr pointe vers 1.2.3.4, la machine est en 5.6.7.8
      → corrige l'enregistrement A chez le registrar, puis relance
  ✓ dépôt git — joignable en écriture
  ✓ ressources — 2.0 Go de RAM, 14.2 Go libres
```

`doctor` **prouve** au lieu de vérifier : il envoie un vrai email et résout
vraiment le DNS (D93). Une clé présente mais fausse passe un contrôle de forme,
et se découvre le jour où le client ne peut plus se connecter. `--no-email`
saute le seul envoi, quand le quota du jour compte plus que la preuve.

Il tourne **là où on l'appelle** : depuis ta machine il éprouve la configuration
du dépôt, sur le VPS il éprouve aussi les siennes. `--host <ip>` lui donne
l'adresse que le domaine doit désigner. Il tourne en fin de `deploy`, et se
relance seul à tout moment.

## Retours en arrière

| Ce qui a cassé | Le geste |
|---|---|
| un contenu | `git revert` dans le dépôt, ou la version précédente depuis le panel |
| un build | rien à faire — `current` n'a pas bougé (`publication.md`) |
| une montée de version du socle | repointer la version dans `package.json`, puis `npm run deploy` |
| la machine entière | `git clone` + `deploy` sur un VPS neuf + restauration du SQLite |

La dernière ligne est la procédure de reprise après sinistre. C'est la même que
pour un nouveau client, donc elle est validée à chaque installation plutôt
qu'écrite dans un document que personne ne teste.

## Ce qui tourne sur la machine

Deux conteneurs : l'application Node et Caddy. Dimensionnement, sauvegardes et
configuration Caddy sont dans `deploiement.md`.
