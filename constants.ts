
export const SAMPLE_YAML = `name: ai-code-gen-v6

storages:
  - name: qiniu
    type: s3
    bucket: xytschool
    region: cn-east-1
    access_key_id: BMEpw0S-VbwPTAYEiZFmVXRutAJFSNH68UTI92jI
    secret_access_key: KJp_bcCaURH-EIa9qzOWG-7OGKDEcgkMiI7_ndHV
    endpoint: https://s3.cn-east-1.qiniucs.com
    path_style: false

codes:
  - name: DateTime
    code: "function getDateTime(){ return new Date().toLocaleString() }"

nodes:
  - name: Webhook
    type: webhook
    parameters:
      httpMethod: POST
      path: start
    global:
      question: "={{ $P.question }}"

  - name: chatgpt_node
    type: chatgpt
    parameters:
      question:  "={{ $global.question }}"
      role: "assistant"
    global:
      result: "={{ $P.result }}"

  - name: log_execution
    type: execute_command
    parameters:
      command: "echo 'AI Generation Completed. Result length: {{ $chatgpt_node.result.length }}'"
      workdir: "/var/log/workflow"

  - name: findNoVoiceLocation
    type: pg
    parameters:
      action: query
      sql: "SELECT * FROM locations WHERE voice IS NULL"

  - name: desc
    type: chatgpt
    parameters:
      question: "Describe this location"

  - name: final_notification
    type: execute_command
    parameters:
      command: "echo 'Workflow process finished.'"

  - name: notify_external_system
    type: http
    parameters:
      method: POST
      url: "https://api.example.com/webhook"
      headers: 
        Content-Type: "application/json"
      body:
        status: "success"
        message: "Workflow completed successfully"

connections:
  Webhook:
    - - node: chatgpt_node
  
  chatgpt_node:
    - - node: log_execution
  
  findNoVoiceLocation:
    - - node: desc
        when: 
          - "={{ $findNoVoiceLocation.length > 0 }}"

  desc:
    - - node: final_notification

  final_notification:
    - - node: notify_external_system
`;
