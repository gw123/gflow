
export interface CredentialDefinition {
  name: string;
  type: string;
  value: Record<string, any>;
  validation?: Record<string, string>;
}

export const CREDENTIAL_DEFINITIONS: CredentialDefinition[] = [
  {
    name: "mysql",
    type: "database",
    value: {
      hostname: "db.example.com",
      port: "3306",
      database: "exampledb",
      username: "exampleuser",
      password: "examplepassword"
    },
    validation: {
      hostname: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      port: "^[0-9]{1,5}$",
      database: "^[a-zA-Z0-9_]+$",
      username: "^[a-zA-Z0-9_]+$",
      password: "^[^\\s]+$"
    }
  },
  {
    name: "pg",
    type: "database",
    value: {
      hostname: "db.example.com",
      port: "3306",
      database: "exampledb",
      username: "exampleuser",
      password: "examplepassword"
    },
    validation: {
      hostname: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      port: "^[0-9]{1,5}$",
      database: "^[a-zA-Z0-9_]+$",
      username: "^[a-zA-Z0-9_]+$",
      password: "^[^\\s]+$"
    }
  },
  {
    name: "redis",
    type: "cache",
    value: {
      hostname: "redis.example.com",
      port: "6379",
      password: "redispassword"
    },
    validation: {
      hostname: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      port: "^[0-9]{1,5}$",
      password: "^[^\\s]*$"
    }
  },
  {
    name: "jwt",
    type: "auth",
    value: {
      name: "jwtAuth",
      type: "jwt",
      secret: "123456",
      appName: "getIpInfo",
      username: "node01",
      userID: "1"
    },
    validation: {
      name: "^[a-zA-Z0-9_-]+$",
      type: "^jwt$",
      secret: "^[^\\s]+$",
      appName: "^[a-zA-Z0-9_-]+$",
      username: "^[a-zA-Z0-9_-]+$",
      userID: "^[0-9]+$"
    }
  },
  {
    name: "s3",
    type: "storage",
    value: {
      bucket: "example-bucket",
      region: "us-east-1",
      access_key_id: "example-access-key-id",
      secret_access_key: "example-secret-access-key",
      endpoint: "https://s3.us-east-1.amazonaws.com",
      path_style: false
    },
    validation: {
      bucket: "^[a-z0-9][a-z0-9-_.]*$",
      region: "^[a-z0-9][a-z0-9-]*$",
      access_key_id: "^[A-Za-z0-9_-]+$",
      secret_access_key: "^[A-Za-z0-9/+=_-]+$",
      endpoint: "^https?://[a-zA-Z0-9][a-zA-Z0-9-_.]*$"
    }
  },
  {
    name: "ftp",
    type: "storage",
    value: {
      username: "username",
      password: "password",
      hostname: "ftp.example.com"
    },
    validation: {
      username: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      password: "^[^\\s]+$",
      hostname: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$"
    }
  },
  {
    name: "webhook",
    type: "webhook",
    value: {
      frp: {
        serverAddr: "frp.example.com",
        serverPort: 2023,
        token: "example-token",
        customDomains: ["example1.com", "example2.com"],
        localIP: "127.0.0.1",
        proxyName: "example-proxy"
      },
      auth: {
        authType: "jwt",
        authSecret: "example-jwt-secret"
      }
    }
    // Validation commented out in source, kept minimal here or handled structurally
  },
  {
    name: "openai",
    type: "llm",
    value: {
      openai_proxy: "https://api.openai.com/v1",
      openai_api_key: "example-openai-api-key"
    },
    validation: {
      openai_proxy: "^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$",
      openai_api_key: "^sk-[A-Za-z0-9_-]+$"
    }
  },
  {
    name: "feishu",
    type: "feishu",
    value: {
      app_id: "appid",
      app_secret: "appsecret"
    },
    validation: {
      app_id: "^[A-Za-z0-9_-]+$",
      app_secret: "^[A-Za-z0-9_-]+$"
    }
  },
  {
    name: "feishu_custom_robot",
    type: "feishu",
    value: {
      webhook_url: "https://open.feishu.cn/open-apis/bot/v2/hook/token"
    },
    validation: {
      webhook_url: "^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$"
    }
  },
  {
    name: "rocketmq",
    type: "mq",
    value: {
      endpoint: "rocketmq.example.com:9876",
      access_key: "example-access-key",
      secret_key: "example-secret-key",
      namespace: "example-namespace",
      consumer_group: "example-consumer-group"
    },
    validation: {
      endpoint: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*:[0-9]{1,5}$",
      access_key: "^[A-Za-z0-9_-]+$",
      secret_key: "^[A-Za-z0-9/+=_-]+$",
      namespace: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      consumer_group: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$"
    }
  },
  {
    name: "kafka",
    type: "mq",
    value: {
      brokers: "kafka1.example.com:9092,kafka2.example.com:9092",
      username: "",
      password: "",
      sasl_mechanism: "",
      security_protocol: "PLAINTEXT"
    },
    validation: {
      brokers: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*:[0-9]{1,5}(,[a-zA-Z0-9][a-zA-Z0-9-_.]*:[0-9]{1,5})*$",
      username: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$|^$",
      password: "^[^\\s]*$",
      sasl_mechanism: "^(PLAIN|SCRAM-SHA-256|SCRAM-SHA-512)$|^$",
      security_protocol: "^(PLAINTEXT|SSL|SASL_PLAINTEXT|SASL_SSL)$"
    }
  },
  {
    name: "rabbitmq",
    type: "mq",
    value: {
      hostname: "rabbitmq.example.com",
      port: "5672",
      username: "example-username",
      password: "example-password",
      vhost: "/",
      ssl: false
    },
    validation: {
      hostname: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      port: "^[0-9]{1,5}$",
      username: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      password: "^[^\\s]+$",
      vhost: "^[a-zA-Z0-9/_-]+$",
      ssl: "^(true|false)$"
    }
  },
  {
    name: "mongodb",
    type: "database",
    value: {
      uri: "mongodb://username:password@host1.example.com:27017,host2.example.com:27017/database?replicaSet=rs0",
      database: "exampledb",
      auth_source: "admin"
    },
    validation: {
      uri: "^mongodb(\\+srv)?://[^\\s]+$",
      database: "^[a-zA-Z0-9_]+$",
      auth_source: "^[a-zA-Z0-9_]+$"
    }
  },
  {
    name: "clickhouse",
    type: "database",
    value: {
      hostname: "clickhouse.example.com",
      port: "9000",
      database: "exampledb",
      username: "exampleuser",
      password: "examplepassword",
      secure: false
    },
    validation: {
      hostname: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      port: "^[0-9]{1,5}$",
      database: "^[a-zA-Z0-9_]+$",
      username: "^[a-zA-Z0-9_]+$",
      password: "^[^\\s]+$",
      secure: "^(true|false)$"
    }
  },
  {
    name: "elasticsearch",
    type: "database",
    value: {
      endpoints: "http://es1.example.com:9200,http://es2.example.com:9200",
      username: "exampleuser",
      password: "examplepassword",
      ca_cert: ""
    },
    validation: {
      endpoints: "^https?://[a-zA-Z0-9][a-zA-Z0-9-_.]*:[0-9]{1,5}(,https?://[a-zA-Z0-9][a-zA-Z0-9-_.]*:[0-9]{1,5})*$",
      username: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      password: "^[^\\s]+$",
      ca_cert: "^[^\\s]*$"
    }
  },
  {
    name: "tidb",
    type: "database",
    value: {
      hostname: "tidb.example.com",
      port: "4000",
      database: "exampledb",
      username: "exampleuser",
      password: "examplepassword"
    },
    validation: {
      hostname: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      port: "^[0-9]{1,5}$",
      database: "^[a-zA-Z0-9_]+$",
      username: "^[a-zA-Z0-9_]+$",
      password: "^[^\\s]+$"
    }
  },
  {
    name: "cassandra",
    type: "database",
    value: {
      hostname: "cassandra.example.com",
      port: "9042",
      keyspace: "exampledb",
      username: "exampleuser",
      password: "examplepassword",
      datacenter: "datacenter1"
    },
    validation: {
      hostname: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      port: "^[0-9]{1,5}$",
      keyspace: "^[a-zA-Z0-9_]+$",
      username: "^[a-zA-Z0-9_]+$",
      password: "^[^\\s]+$",
      datacenter: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$"
    }
  },
  {
    name: "influxdb",
    type: "database",
    value: {
      url: "http://influxdb.example.com:8086",
      token: "example-token",
      org: "example-org",
      bucket: "example-bucket"
    },
    validation: {
      url: "^https?://[a-zA-Z0-9][a-zA-Z0-9-_.]*:[0-9]{1,5}$",
      token: "^[A-Za-z0-9_-]+$",
      org: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      bucket: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$"
    }
  },
  {
    name: "smtp",
    type: "email",
    value: {
      hostname: "smtp.example.com",
      port: "587",
      username: "example@example.com",
      password: "example-password",
      from: "example@example.com",
      tls: true
    },
    validation: {
      hostname: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      port: "^[0-9]{1,5}$",
      username: "^[^\\s]+$",
      password: "^[^\\s]+$",
      from: "^[^\\s]+$",
      tls: "^(true|false)$"
    }
  },
  {
    name: "aliyun_sms",
    type: "sms",
    value: {
      access_key_id: "example-access-key-id",
      access_key_secret: "example-access-key-secret",
      sign_name: "example-sign",
      template_code: "SMS_123456789"
    },
    validation: {
      access_key_id: "^[A-Za-z0-9_-]+$",
      access_key_secret: "^[A-Za-z0-9/+=_-]+$",
      sign_name: "^[a-zA-Z0-9\u4e00-\u9fa5_-]+$",
      template_code: "^SMS_[0-9]+$"
    }
  },
  {
    name: "tencent_sms",
    type: "sms",
    value: {
      secret_id: "example-secret-id",
      secret_key: "example-secret-key",
      app_id: "example-app-id",
      sign_name: "example-sign",
      template_id: "123456"
    },
    validation: {
      secret_id: "^[A-Za-z0-9_-]+$",
      secret_key: "^[A-Za-z0-9/+=_-]+$",
      app_id: "^[0-9]+$",
      sign_name: "^[a-zA-Z0-9\u4e00-\u9fa5_-]+$",
      template_id: "^[0-9]+$"
    }
  },
  {
    name: "alipay",
    type: "payment",
    value: {
      app_id: "example-app-id",
      private_key: "example-private-key",
      public_key: "example-public-key",
      notify_url: "https://example.com/notify",
      return_url: "https://example.com/return"
    },
    validation: {
      app_id: "^[0-9]+$",
      private_key: "^[^\\s]+$",
      public_key: "^[^\\s]+$",
      notify_url: "^https?://[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      return_url: "^https?://[a-zA-Z0-9][a-zA-Z0-9-_.]*$"
    }
  },
  {
    name: "wechat_pay",
    type: "payment",
    value: {
      app_id: "example-app-id",
      mch_id: "example-mch-id",
      api_key: "example-api-key",
      cert_path: "/path/to/cert.pem",
      key_path: "/path/to/key.pem",
      notify_url: "https://example.com/notify"
    },
    validation: {
      app_id: "^[a-zA-Z0-9_-]+$",
      mch_id: "^[0-9]+$",
      api_key: "^[A-Za-z0-9/+=_-]+$",
      cert_path: "^[^\\s]+$",
      key_path: "^[^\\s]+$",
      notify_url: "^https?://[a-zA-Z0-9][a-zA-Z0-9-_.]*$"
    }
  },
  {
    name: "ssh",
    type: "host",
    value: {
      hostname: "example.com",
      port: "22",
      username: "root",
      password: "example-password",
      private_key: "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----",
      passphrase: "",
      timeout: "30"
    },
    validation: {
      hostname: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      port: "^[0-9]{1,5}$",
      username: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      password: "^[^\\s]*$",
      private_key: "^[^\\s]*$",
      passphrase: "^[^\\s]*$",
      timeout: "^[0-9]+$"
    }
  },
  {
    name: "rdp",
    type: "host",
    value: {
      hostname: "example.com",
      port: "3389",
      username: "administrator",
      password: "example-password",
      domain: "",
      timeout: "30"
    },
    validation: {
      hostname: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      port: "^[0-9]{1,5}$",
      username: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      password: "^[^\\s]+$",
      domain: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$|^$"
      ,timeout: "^[0-9]+$"
    }
  },
  {
    name: "vnc",
    type: "host",
    value: {
      hostname: "example.com",
      port: "5900",
      password: "example-password",
      timeout: "30"
    },
    validation: {
      hostname: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      port: "^[0-9]{1,5}$",
      password: "^[^\\s]+$",
      timeout: "^[0-9]+$"
    }
  },
  {
    name: "telnet",
    type: "host",
    value: {
      hostname: "example.com",
      port: "23",
      username: "admin",
      password: "example-password",
      timeout: "30"
    },
    validation: {
      hostname: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      port: "^[0-9]{1,5}$",
      username: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      password: "^[^\\s]+$",
      timeout: "^[0-9]+$"
    }
  },
  {
    name: "k8s",
    type: "host",
    value: {
      api_server: "https://kubernetes.example.com:6443",
      token: "example-token",
      ca_cert: "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
      client_cert: "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
      client_key: "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----",
      namespace: "default",
      context: "default"
    },
    validation: {
      api_server: "^https://[a-zA-Z0-9][a-zA-Z0-9-_.]*:[0-9]{1,5}$",
      token: "^[A-Za-z0-9_-]+$",
      ca_cert: "^[^\\s]*$",
      client_cert: "^[^\\s]*$",
      client_key: "^[^\\s]*$",
      namespace: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$",
      context: "^[a-zA-Z0-9][a-zA-Z0-9-_.]*$"
    }
  },
  {
    name: "chartAgent",
    type: "agent",
    value: {
      question: "={{ $P.question }} \n 下面是查询结果：{{ $P.result }} ",
      instructions: "You are a helpful assistant.",
      model: "gpt-4o-mini",
      functions: "jsonToEchart,webSearch"
    },
    validation: {
      question: "^[^\\s]+$",
      instructions: "^[^\\s]+$",
      model: "^[a-zA-Z0-9_-]+$",
      functions: "^[a-zA-Z0-9_,]+$"
    }
  },
  {
    name: "dyForm",
    type: "ai_low_code",
    value: {
      nextPageMethod: "replace",
      question: "= 请你使用一个 MarkDown 节点渲染下面内容:\n{{ $P.result }}"
    },
    validation: {
      nextPageMethod: "^replace$",
      question: "^[^\\s]+$"
    }
  }
];
