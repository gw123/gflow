/// <reference types="vite/client" />

declare module '*.ts?worker' {
  const workerTsConstructor: {
    new (): Worker;
  };
  export default workerTsConstructor;
}
