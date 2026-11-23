// React and ReactDOM as one script for the sandbox (plugin in vite.config.ts).
declare module 'virtual:react-sandbox' {
  const script: string;
  export default script;
}
