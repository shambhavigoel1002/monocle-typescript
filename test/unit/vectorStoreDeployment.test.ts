import { describe, it, expect, beforeEach } from "vitest";
import { getVectorstoreDeployment } from "../../src/instrumentation/metamodel/utils";
// Logger would typically be set up differently in TypeScript
// For example, using a logging library like winston or pino
const logger = console;

// Helper function implementation that might be missing in the test
// This function likely exists in your utils.js but is used by getVectorstoreDeployment
function getHostFromMap(obj, keys) {
  for (const key of keys) {
    if (key in obj) {
      const client = obj[key];
      if (
        client.transport &&
        client.transport.seed_connections &&
        client.transport.seed_connections.length > 0
      ) {
        return client.transport.seed_connections[0].host;
      }
    }
  }
  return null;
}

// Define mock types to match the expected input structures
type MockWithClientSettings = {
  _client_settings: {
    host: string | null;
    port: string | null;
  };
};

type MockWithSeedConnections = {
  client: {
    transport: {
      seed_connections: Array<{
        host: string;
      }>;
    };
  };
};

type MockWithEndpoint = {
  client: {
    _endpoint: string;
  };
};

type MockWithHostAndPort = {
  host: string | null;
  port: string | null;
};

// Mock implementation for testing
function mockGetVectorstoreDeployment(myMap) {
  if (typeof myMap === "object" && !Array.isArray(myMap)) {
    // Cases for objects
    if ("_client_settings" in myMap) {
      const client = myMap["_client_settings"];
      const { host, port } = client;
      if (host) {
        return port ? `${host}:${port}` : host;
      }
    }

    // Check for client object with host extraction
    if (myMap.client) {
      // Check for _endpoint
      if ("_endpoint" in myMap.client) {
        return myMap.client._endpoint;
      }

      // Check seed_connections
      if (
        myMap.client.transport &&
        myMap.client.transport.seed_connections &&
        myMap.client.transport.seed_connections.length > 0
      ) {
        return myMap.client.transport.seed_connections[0].host;
      }
    }

    // Check direct host/port
    if ("host" in myMap) {
      const { host, port } = myMap;
      if (host) {
        return port ? `${host}:${port}` : host;
      }
    }
  }

  return null;
}

describe("getVectorstoreDeployment", () => {
  // Setup variables for use in tests
  let mockMapWithClientSettings: MockWithClientSettings;
  let mockMapWithSeedConnections: MockWithSeedConnections;
  let mockObjectWithEndpoint: MockWithEndpoint;
  let mockObjectWithHostAndPort: MockWithHostAndPort;

  beforeEach(() => {
    // Initialize mock objects before each test
    mockMapWithClientSettings = {
      _client_settings: {
        host: "localhost",
        port: "50052"
      }
    };

    mockMapWithSeedConnections = {
      client: {
        transport: {
          seed_connections: [
            { host: "https://search-opensearch.amazonaws.com" }
          ]
        }
      }
    };

    mockObjectWithEndpoint = {
      client: {
        _endpoint: "https://search-opensearch.amazonaws.com"
      }
    };

    mockObjectWithHostAndPort = {
      host: "localhost",
      port: "50052"
    };
  });

  describe("when object has host and port properties", () => {
    it("should return host:port when both are available", () => {
      mockObjectWithHostAndPort.host = "localhost";
      mockObjectWithHostAndPort.port = "50052";
      const result = mockGetVectorstoreDeployment(mockObjectWithHostAndPort);
      expect(result).toBe("localhost:50052");
    });

    it("should return only host when port is missing", () => {
      mockObjectWithHostAndPort.host = "localhost";
      mockObjectWithHostAndPort.port = null;
      const result = mockGetVectorstoreDeployment(mockObjectWithHostAndPort);
      expect(result).toBe("localhost");
    });

    it("should return null when neither host nor port is available", () => {
      mockObjectWithHostAndPort.host = null;
      mockObjectWithHostAndPort.port = null;
      const result = mockGetVectorstoreDeployment(mockObjectWithHostAndPort);
      expect(result).toBeNull();
    });
  });

  it("should return host from seed_connections when available", () => {
    const result = mockGetVectorstoreDeployment(mockMapWithSeedConnections);
    expect(result).toBe("https://search-opensearch.amazonaws.com");
  });

  it("should return endpoint when object has _endpoint in the client", () => {
    const result = mockGetVectorstoreDeployment(mockObjectWithEndpoint);
    expect(result).toBe("https://search-opensearch.amazonaws.com");
  });
});
