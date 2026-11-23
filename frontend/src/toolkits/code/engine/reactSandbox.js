// Entry of `virtual:react-sandbox` (vite.config.ts): what React exercises import.
import React from 'react';
import ReactDOM from 'react-dom';
import Client from 'react-dom/client';
import Jsx from 'react/jsx-runtime';

window.__externals = { react: React, 'react-dom': ReactDOM, 'react-dom/client': Client, 'react/jsx-runtime': Jsx };
