# Moodex on Nix

The `flake.nix` exposes three things:

- `packages.moodex` (also `packages.default`) — the installable app
- `overlays.default` — an overlay for nixpkgs
- `devShells.default` — a shell for hacking on Moodex

## Install into your system config (Flakes)

Add the input:

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    moodex.url = "github:inoshmatheesha/moodex";
  };

  outputs = { self, nixpkgs, moodex, ... }: {
    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ({ pkgs, ... }: {
          environment.systemPackages = [ moodex.packages.x86_64-linux.default ];
        })
      ];
    };
  };
}
```

For home-manager, inside your home config:

```nix
{
  inputs.moodex.url = "github:inoshmatheesha/moodex";

  outputs = { nixpkgs, home-manager, moodex, ... }: {
    homeConfigurations.you = home-manager.lib.homeManagerConfiguration {
      pkgs = nixpkgs.legacyPackages.x86_64-linux;
      modules = [
        ({ pkgs, ... }: {
          home.packages = [ moodex.packages.x86_64-linux.default ];
        })
      ];
    };
  };
}
```

## Install via an overlay

Useful when you want `pkgs.moodex` available everywhere rather than referencing `moodex.packages...` directly:

```nix
{
  inputs.moodex.url = "github:inoshmatheesha/moodex";

  outputs = { nixpkgs, moodex, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs {
        inherit system;
        overlays = [ moodex.overlays.default ];
      };
    in {
      nixosConfigurations.myhost = pkgs.lib.nixosSystem {
        inherit system;
        modules = [{ environment.systemPackages = [ pkgs.moodex ]; }];
      };
    };
}
```

## One-off / user installs (no config change)

```bash
# install into your profile
nix profile install github:inoshmatheesha/moodex

# or just run it once
nix run github:inoshmatheesha/moodex

# from a local checkout
nix profile install .
nix run .
```

After installing, `moodex` is on your `PATH` and a `Moodex` desktop entry + icon are registered.

## Development shell

```bash
git clone https://github.com/inoshmatheesha/moodex
cd moodex
nix develop          # nodejs, python3, yt-dlp, ffmpeg
npm install
npm start
```

## Notes

- The package wraps the nixpkgs `electron` with the app directory and puts `yt-dlp` and `ffmpeg` on `PATH`, so Moodex finds them instead of self-downloading.
- `npmDepsHash` in `flake.nix` must be updated whenever `package.json`/`package-lock.json` change. Rebuild with a wrong/placeholder hash and copy the reported `got:` value, or regenerate it with `nix-prefetch-npm-deps` / `prefetch-npm-deps`.
