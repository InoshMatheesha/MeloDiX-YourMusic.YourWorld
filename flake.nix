{
  description = "Moodex - a desktop audio player (Electron)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    let
      mkMoodex = pkgs:
        pkgs.buildNpmPackage rec {
          pname = "moodex";
          version = "1.1.9";
          src = self;

          npmDepsHash = "sha256-rF4yvXjCFcrILJ3G2TbnqxvjScRafgW9OPZtOpT8Akw=";

          ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
          forceGitDeps = true;
          npmInstallFlags = [ "--omit=dev" ];

          buildPhase = "true";

          installPhase =
            let
              appDir = "$out/share/moodex";
              runtimeDeps = pkgs.lib.makeBinPath [ pkgs.yt-dlp pkgs.ffmpeg ];
              desktop = pkgs.makeDesktopItem {
                name = "Moodex";
                desktopName = "Moodex";
                genericName = "Audio Player";
                exec = "moodex";
                icon = "moodex";
                categories = [ "AudioVideo" "Audio" "Player" ];
                startupWMClass = "moodex";
              };
            in
            ''
              runHook preInstall

              mkdir -p ${appDir}
              for f in *; do cp -r "$f" ${appDir}/; done

              mkdir -p $out/bin
              makeWrapper ${pkgs.electron}/bin/electron $out/bin/moodex \
                --add-flags ${appDir} \
                --prefix PATH : ${runtimeDeps}

              mkdir -p $out/share/applications
              cp ${desktop}/share/applications/*.desktop $out/share/applications/

              mkdir -p $out/share/icons/hicolor/256x256/apps
              cp ${appDir}/assets/icon.png $out/share/icons/hicolor/256x256/apps/moodex.png

              runHook postInstall
            '';

          meta = with pkgs.lib; {
            description = "Moodex - audio player made for humans";
            homepage = "https://github.com/inoshmatheesha/moodex";
            license = licenses.mit;
            mainProgram = "moodex";
            platforms = platforms.linux ++ platforms.darwin;
          };
        };
    in
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        packages = {
          default = mkMoodex pkgs;
          moodex = mkMoodex pkgs;
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs
            python3
            yt-dlp
            ffmpeg
          ];

          shellHook = ''
            echo "Moodex dev shell. Install deps and run with:"
            echo "  npm install && npm start"
          '';
        };
      })
    // {
      overlays.default = final: prev: {
        moodex = mkMoodex final;
      };
    };
}
