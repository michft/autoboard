// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en" style="background-color: #0a0a0a; color: #e0e0e0;">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
          <style>{`
            html, body {
              margin: 0;
              padding: 0;
              background-color: #0a0a0a;
              color: #e0e0e0;
            }
          `}</style>
          {assets}
        </head>
        <body style="background-color: #0a0a0a; color: #e0e0e0;">
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
