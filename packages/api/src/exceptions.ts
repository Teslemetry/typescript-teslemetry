// src/exceptions.ts

export class TeslemetryStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeslemetryStreamError";
  }
}

export class TeslemetryStreamConnectionError extends TeslemetryStreamError {
  constructor(message: string) {
    super(message);
    this.name = "TeslemetryStreamConnectionError";
  }
}

export class TeslemetryVehicleStreamNotConfigured extends TeslemetryStreamError {
  constructor(message: string) {
    super(message);
    this.name = "TeslemetryVehicleStreamNotConfigured";
  }
}

export class TeslemetryStreamEnded extends TeslemetryStreamError {
  constructor(message: string) {
    super(message);
    this.name = "TeslemetryStreamEnded";
  }
}

export class ValueError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ValueError";
    }
  }
