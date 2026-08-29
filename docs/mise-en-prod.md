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

1. installe Docker s'il est absent
2. clone le dépôt du site
3. dépose le `.env` (lu depuis ta machine, jamais versionné)
4. `docker compose up -d` — l'application Node et Caddy
5. Caddy obtient le certificat, le domaine pointant déjà vers la machine
6. premier build et bascule
7. crée le compte du client et affiche son mot de passe

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
  ✓ site.config.ts valide
  ✓ .env complet
  ✓ email — test envoyé à leo@exemple.fr, accepté par le fournisseur
  ✗ DNS — atelier-duvallon.fr pointe vers 1.2.3.4, la machine est en 5.6.7.8
      → corrige l'enregistrement A chez le registrar, puis relance
  ✓ dépôt git joignable en écriture
  ✓ 2 Go de RAM, 14 Go libres
```

`doctor` **prouve** au lieu de vérifier : il envoie un vrai email et résout
vraiment le DNS. Une clé présente mais fausse passe un contrôle de forme, et se
découvre le jour où le client ne peut plus se connecter.

Il tourne en fin de `deploy`, et se relance seul à tout moment.

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
