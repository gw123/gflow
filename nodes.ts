
export const TEMPLATE_LIBRARY: Record<string, { description: string; templates: any[] }> = {
  trigger: {
    description: "工作流触发器相关模板，用于启动工作流",
    templates: [
      {
        name: "Manual",
        type: "manual",
        parameters: {
          input_example: { key: "value" }
        },
        global: {
          start_time: "={{ $P.startTime }}"
        }
      },
      {
        name: "Webhook",
        type: "webhook",
        credentialType: "webhook",
        credentials: {
          frp: {
            serverAddr: 'frp.lo.mytool.zone',
            serverPort: 2023,
            token: 'demo-token-123456',
            customDomains: ['xxx.lo.mytool.zone'],
            localIP: "127.0.0.1",
            proxyName: 'xxx'
          }
        },
        parameters: {
          httpMethod: "POST",
          path: "webhook",
          port: 8088,
          exportHeader: { Authorization: "Authorization", Host: "Host" },
          exportQuery: { rand: "rand" },
          exportBody: { desc: "desc", locationName: "locationName" }
        },
        global: {
          locationName: "={{ $P.locationName }}"
        }
      },
      {
        name: "HTTP",
        type: "http",
        parameters: {
          method: "GET",
          url: "https://api.example.com/data",
          headers: { "Content-Type": "application/json" },
          body: ""
        }
      },
      {
        name: "Timer",
        type: "timer",
        init_delay: 2,
        parameters: [{ secondsInterval: 10 }]
      }
    ]
  },
  llm: {
    description: "大语言模型相关模板，用于文本生成和处理",
    templates: [
      {
        name: "ChatGPT",
        type: "chatgpt",
        credentialType: "openai",
        credentials: {
          openai_proxy: 'https://api.openai.com/v1',
          openai_api_key: 'sk-demo-1234567890abcdefghijklmnopqrstuvwxyz'
        },
        parameters: {
          question: "=请帮忙生成一个景点的50字左右的描述信息：景区名称 {{ $global.locationName }}，景区简介{{ $global.locationInfo }}",
          role: "assistant",
          roleDesc: "你是一名导游"
        },
        global: {
          generateContent: "={{ $P.result }}"
        }
      },
      {
        name: "TTS",
        type: "tts",
        credentialType: "openai",
        credentials: {
          openai_proxy: 'https://api.openai.com/v1',
          openai_api_key: 'sk-demo-1234567890abcdefghijklmnopqrstuvwxyz',
          baidu_api_key: 'demo-baidu-api-key-123456',
          baidu_secret: 'demo-baidu-secret-abcdef'
        },
        artifact: {
          storage_name: "qiniu",
          from_path: "1",
          target_path: "=ai_gen/{{ $global.locationName }}_{{$global.locationID}}.mp3",
          is_overwrite: true
        },
        parameters: {
          text: "={{ $P.result }}",
          voice: "alloy"
        },
        global: {
          artifactKey: "=https://data.xytschool.com/ai_gen/{{ $global.locationName }}_{{$global.locationID}}.mp3"
        }
      },
      {
        name: "Agent",
        type: "agent",
        parameters: {
          question: "={{ $P.question }}",
          instructions: "You are a helpful assistant.",
          model: "gpt-4",
          functions: ["jsonToEchart", "webSearch"]
        }
      },
      {
        name: "AILowCode",
        type: "ai_low_code",
        parameters: {
          nextPageMethod: "replace",
          question: "=请使用MarkDown渲染以下内容：{{ $P.result }}"
        }
      },
      {
        name: "prompt_template",
        type: "prompt_template",
        parameters: {
          template_id: 33
        },
        global: {
          workflow_usage: "={{ $P.result }}"
        }
      }
    ]
  },
  database: {
    description: "数据库操作相关模板，支持多种数据库类型",
    templates: [
      {
        name: "MySQLQuery",
        type: "mysql",
        credentialType: "mysql",
        credentials: {
          hostname: 'db.test.mytool.zone',
          port: '21062',
          database: 'mall',
          username: 'dever',
          password: 'demo-mysql-password-123456'
        },
        parameters: {
          action: "query",
          sql: "=select * from locations where voice_url = '' limit 1"
        },
        global: {
          locationName: "={{ $P.first.name }}",
          locationID: "={{ $P.first.id }}",
          locationInfo: "={{ $P.first.info }}"
        }
      },
      {
        name: "PostgreSQL",
        type: "pg",
        credentialType: "pg",
        credentials: {
          hostname: 'db.example.com',
          port: '5432',
          database: 'exampledb',
          username: 'exampleuser',
          password: 'demo-pg-password-123456'
        },
        parameters: {
          action: "query",
          sql: "SELECT * FROM example_table"
        }
      }
    ]
  },
  cache: {
    description: "缓存操作相关模板，支持多种缓存类型",
    templates: [
      {
        name: "Redis",
        type: "redis",
        credentialType: "redis",
        credentials: {
          hostname: 'redis.example.com',
          port: '6379',
          password: 'demo-redis-password-123456'
        },
        parameters: {
          action: "get",
          key: "example_key"
        }
      },
      {
        name: "RedisList",
        type: "redis_list",
        credentialType: "redis",
        credentials: {
          hostname: 'redis.example.com',
          port: '6379',
          password: 'demo-redis-password-123456',
          db: 0
        },
        parameters: {
          action: "lpush",
          key: "example_list",
          value: "example_value"
        }
      }
    ]
  },
  file: {
    description: "文件操作相关模板，用于文件处理和压缩",
    templates: [
      {
        name: "FileReplace",
        type: "file",
        parameters: {
          action: "cp-replace",
          from: 'xytschool\/task-mini-program:[[:space:]]*\([0-9]\+\(\.[0-9]\+\)\{1,2\}\)',
          to: "={{ $P.image }}",
          file: "={{ $P.workdir }}/docker-compose.yml",
          newFile: "",
          workdir: "={{ $global.deployDir }}"
        }
      },
      {
        name: "FileCompress",
        type: "file_compress",
        parameters: {
          action: "unzip",
          zipFilePath: "={{ $P.dist_path }}",
          outputDir: '=/tmp/{{ $global.file_token }}_unzip'
        }
      }
    ]
  },
  docker: {
    description: "Docker容器管理相关模板",
    templates: [
      {
        name: "DockerCompose",
        type: "docker_compose",
        parameters: {
          action: "up",
          "docker-compose-file": "={{ $P.newFile }}",
          workdir: "={{ $global.deployDir }}"
        }
      },
      {
        name: "DockerBuild",
        type: "docker",
        parameters: {
          reg: "xytschool",
          image: "task-mini-program",
          tag: "={{ $global.headCommitID }}",
          dockerfile: "Dockerfile",
          workdir: "={{ $P.sourcePath }}"
        }
      }
    ]
  },
  system: {
    description: "系统操作相关模板，用于定时和命令执行",
    templates: [
      {
        name: "ExecuteCommand",
        type: "execute_command",
        parameters: {
          command: "=cp -r /tmp/{{ $global.file_token }}_unzip/build/* {{ $global.deployDir }}",
          workdir: "."
        }
      },
      {
        name: "Wait",
        type: "wait",
        parameters: {
          seconds: 60
        }
      }
    ]
  },
  git: {
    description: "Git版本控制相关模板",
    templates: [
      {
        name: "GitClone",
        type: "git",
        parameters: {
          action: "clone",
          workdir: "={{ $global.rootDir }}",
          gitURL: "={{ $global.gitURL }}",
          repoName: "={{ $global.repoName }}",
          ref: "={{ $P.Ref }}",
          headCommitID: "={{ $P.headCommitID }}"
        }
      }
    ]
  },
  storage: {
    description: "存储操作相关模板，用于文件存储和获取",
    templates: [
      {
        name: "StorageUpload",
        type: "storage",
        parameters: {
          action: "upload",
          storage_name: "oss",
          from_path: "=/tmp/{{ $global.file_token }}_unzip",
          target_path: "public/boss"
        }
      }
    ]
  },
  feishu: {
    description: "飞书集成相关模板，支持多种飞书操作",
    templates: [
      {
        name: "FeishuRobot",
        type: "feishu_custom_robot",
        credentialType: "feishu_custom_robot",
        credentials: {
          webhook_url: 'https://open.feishu.cn/open-apis/bot/v2/hook/demo-webhook-token-123456'
        },
        parameters: {
          text: "=前端代码发布成功 🎉🎉🎉\n环  境  ： {{ $global.deploy_env }}\n发布者  ： {{ $global.user }}\n发布信息 ： {{ $global.desc }}\n文件Token ： {{ $global.file_token }}\n"
        }
      },
      {
        name: "FeishuFileDownload",
        type: "feishu_file_download",
        credentialType: "feishu",
        credentials: {
          app_id: 'demo-feishu-app-id-123456',
          app_secret: 'demo-feishu-app-secret-abcdef'
        },
        parameters: {
          file_token: "={{ $global.file_token }}"
        }
      },
      {
        name: "FeishuDocRead",
        type: "feishu_doc_read",
        credentialType: "feishu",
        credentials: {
          app_id: 'demo-feishu-app-id-123456',
          app_secret: 'demo-feishu-app-secret-abcdef'
        },
        parameters: {
          doc_token: "={{ $global.doc_token }}"
        }
      },
      {
        name: "FeishuDocWrite",
        type: "feishu_doc_write",
        credentialType: "feishu",
        credentials: {
          app_id: 'demo-feishu-app-id-123456',
          app_secret: 'demo-feishu-app-secret-abcdef'
        },
        parameters: {
          action: "create_document",
          title: "={{ $global.document_title || 'Workflow Document' }}",
          folder_token: "={{ $global.folder_token }}"
        }
      },
      {
        name: "FeishuBitable",
        type: "feishu_bitable",
        credentialType: "feishu",
        credentials: {
          app_id: 'demo-feishu-app-id-123456',
          app_secret: 'demo-feishu-app-secret-abcdef'
        },
        parameters: {
          table_id: "={{ $global.table_id }}"
        }
      }
    ]
  },
  mq: {
    description: "消息队列操作相关模板",
    templates: [
      {
        name: "Kafka",
        type: "kafka",
        credentialType: "kafka",
        credentials: {
          brokers: "kafka1.example.com:9092,kafka2.example.com:9092",
          username: "demo-kafka-username",
          password: "demo-kafka-password"
        },
        parameters: {
          topic: "example-topic",
          message: "={{ $P.message }}"
        }
      },
      {
        name: "RocketMQ",
        type: "rocketmq",
        credentialType: "rocketmq",
        credentials: {
          endpoint: "rocketmq.example.com:9876",
          access_key: "demo-rocketmq-access-key",
          secret_key: "demo-rocketmq-secret-key",
          namespace: "example-namespace",
          consumer_group: "example-consumer-group"
        },
        parameters: {
          action: "send",
          topic: "example-topic",
          message: "={{ $P.message }}"
        }
      },
      {
        name: "RabbitMQ",
        type: "rabbitmq",
        credentialType: "rabbitmq",
        credentials: {
          hostname: "rabbitmq.example.com",
          port: "5672",
          username: "demo-rabbitmq-username",
          password: "demo-rabbitmq-password",
          vhost: "/",
          ssl: false
        },
        parameters: {
          action: "send",
          queue: "example-queue",
          message: "={{ $P.message }}"
        }
      }
    ]
  },
  notification: {
    description: "通知服务相关模板，用于发送通知",
    templates: [
      {
        name: "SMS",
        type: "sms",
        credentialType: "sms",
        credentials: {
          provider: "aliyun",
          access_key: "demo-sms-access-key",
          access_secret: "demo-sms-access-secret"
        },
        parameters: {
          phone_numbers: "13800138000",
          template_code: "SMS_123456789",
          template_param: '{"code":"123456"}'
        }
      },
      {
        name: "Mail",
        type: "mail",
        credentialType: "smtp",
        credentials: {
          host: "smtp.example.com",
          port: "587",
          username: "demo@example.com",
          password: "demo-mail-password"
        },
        parameters: {
          to: "recipient@example.com",
          subject: "Test Email",
          body: "This is a test email"
        }
      }
    ]
  },
  control: {
    description: "控制流操作相关模板，用于流程控制",
    templates: [
      {
        name: "If",
        type: "if",
        parameters: {
          condition: "={{ $P.value > 0 }}",
          true_branch: "success",
          false_branch: "failure"
        }
      },
      {
        name: "Switch",
        type: "switch",
        parameters: {
          value: "={{ $P.status }}",
          cases: [
            { value: "success", branch: "success_branch" },
            { value: "failure", branch: "failure_branch" },
            { default: "default_branch" }
          ]
        }
      },
      {
        name: "Loop",
        type: "loop",
        parameters: {
          count: 5,
          interval: 10
        }
      }
    ]
  },
  code: {
    description: "代码操作相关模板，用于代码处理",
    templates: [
      {
        name: "JavaScript",
        type: "js",
        parameters: {
          code: "function process(data) {\n  return data.map(item => item * 2);\n}",
          input: "={{ $P.data }}"
        }
      },
      {
        name: "CodeSearch",
        type: "code_search",
        parameters: {
          query: "={{ $P.search_query }}",
          language: "go"
        }
      },
      {
        name: "CodeProject",
        type: "code_project",
        parameters: {
          project_path: "={{ $P.project_path }}",
          action: "analyze"
        }
      }
    ]
  },
  debug: {
    description: "调试操作相关模板，用于调试信息输出",
    templates: [
      {
        name: "Debug",
        type: "debug",
        parameters: {
          message: "Debug message",
          level: "info"
        }
      }
    ]
  }
};

// Flattened version for easier lookup in drag-and-drop logic
export const NODE_TEMPLATES: Record<string, any> = {};

Object.values(TEMPLATE_LIBRARY).forEach(category => {
  category.templates.forEach(template => {
    NODE_TEMPLATES[template.type] = {
      ...template,
      category: category.description
    };
  });
});
