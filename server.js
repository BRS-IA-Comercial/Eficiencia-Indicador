const fs = require('fs');

// Função que cria um ficheiro físico de histórico
function logError(mensagem) {
  const time = new Date().toISOString();
  fs.appendFileSync('meu_log_de_erros.txt', `[${time}] ${mensagem}\n`);
}

try {
  logError("--- INICIANDO O SERVIDOR ---");
  
  require('dotenv').config();
  const { createServer } = require('http');
  const { parse } = require('url');
  const next = require('next');

  // Em ambiente IIS, queremos forçar para production
  const dev = process.env.NODE_ENV === 'development';
  logError(`Ambiente (dev): ${dev}`);

  const app = next({ dev });
  const handle = app.getRequestHandler();

  const port = process.env.PORT || 3000;
  logError(`Porta definida pelo IIS: ${port}`);

  app.prepare().then(() => {
    logError("App Next.js preparada (build lido com sucesso).");
    
    createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(port, (err) => {
      if (err) {
        logError("ERRO FATAL NO LISTENER: " + err.stack);
        throw err;
      }
      logError(`> Servidor ativo a escutar no pipe/porta: ${port}`);
    });
  }).catch((ex) => {
    logError("ERRO CRÍTICO NO APP.PREPARE(): " + ex.stack);
  });

} catch (e) {
  logError("ERRO GERAL DE STARTUP: " + e.stack);
}