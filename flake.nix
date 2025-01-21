{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.11";

    utils.url = "github:wunderwerkio/nix-utils";
    utils.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = {
    self,
    nixpkgs,
    utils,
  }: utils.lib.systems.eachDefault (system:
    let
      pkgs = import nixpkgs {
        inherit system;
      };
    in {
      devShells = rec {
        default = pkgs.mkShell {
          buildInputs = [
            pkgs.nodejs_22
            pkgs.pnpm_9
          ];
        };
      };
    }
  );
}
