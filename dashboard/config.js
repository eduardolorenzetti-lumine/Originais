window.__ORIGINAIS_SUPABASE__ = {
  // Modo automatico:
  // - local (file://, localhost, 127.0.0.1) e producao (dominio publicado)
  //   usam o MESMO projeto: originais-prod.
  // ATENCAO: o originais-dev foi desativado no Supabase, entao o ambiente local
  // agora aponta para o banco de PRODUCAO. Testes locais afetam dados reais.
  mode: "auto",
  environments: {
    local: {
      url: "https://ypjowxlkmrohaisopzas.supabase.co",
      anonKey: "sb_publishable_rV2aJlmorMi8L28dvrMXrg_SjmFajVp",
      stateId: "originais-main"
    },
    production: {
      url: "https://ypjowxlkmrohaisopzas.supabase.co",
      anonKey: "sb_publishable_rV2aJlmorMi8L28dvrMXrg_SjmFajVp",
      stateId: "originais-main"
    }
  }
};
