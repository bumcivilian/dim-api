import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import jwt from 'express-jwt';
import { authTokenHandler } from './routes/auth-token';
import { platformInfoHandler } from './routes/platform-info';
import { metrics } from './metrics';
import { importHandler } from './routes/import';
import { deleteAllDataHandler } from './routes/delete-all-data';
import { exportHandler } from './routes/export';
import { profileHandler } from './routes/profile';
import { createAppHandler } from './routes/create-app';
import { apiKey } from './apps';

export const app = express();

app.use(metrics.helpers.getExpressMiddleware('http', { timeByUrl: true })); // metrics
app.use(morgan('combined')); // logging
app.use(express.json()); // for parsing application/json

/** CORS config that allows any origin to call */
const permissiveCors = cors({
  maxAge: 3600
});

// These paths can be accessed by any caller
app.get('/', permissiveCors, (_, res) =>
  res.send({ message: 'Hello from DIM!!!' })
);
app.get('/platform_info', permissiveCors, platformInfoHandler);
app.post('/new_app', permissiveCors, createAppHandler);

/* ****** API KEY REQUIRED ****** */
/* Any routes declared below this will require an API Key in X-API-Key header */

app.use(apiKey);

// Use the DIM App looked up from the API Key to set the CORS header
const apiKeyCors = cors((req, callback) => {
  const app = req.dimApp;
  if (app) {
    callback(null, {
      origin: app.origin,
      maxAge: 3600
    });
  } else {
    callback(new Error('Unknown DIM app'));
  }
});
app.use(apiKeyCors);

app.post('/auth/token', authTokenHandler);

/* ****** USER AUTH REQUIRED ****** */
/* Any routes declared below this will require an auth token */

app.all('*', jwt({ secret: process.env.JWT_SECRET! }));

app.get('/test', (req, res) => res.send((req as any).user));

app.get('/profile', profileHandler);
app.post('/import', importHandler);
app.get('/export', exportHandler);
app.post('/delete_all_data', deleteAllDataHandler);

app.use((err: Error, _req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    res.status(401).send({
      error: err.name,
      message: err.message
    });
  } else {
    next(err);
  }
});
