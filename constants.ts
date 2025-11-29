

export const SAMPLE_YAML = `name: simple-debug-flow

nodes:
  - name: Start
    type: manual
    parameters:
      message: "Hello World"
      enableWait: true

  - name: LogStart
    type: debug
    parameters:
      message: "Workflow initiated. Input message: {{ $P.message }}"
      level: "info"

  - name: WaitProcess
    type: wait
    parameters:
      seconds: 3

  - name: LogEnd
    type: debug
    parameters:
      message: "Process finished successfully after waiting."
      level: "success"

connections:
  Start:
    - - node: LogStart

  LogStart:
    - - node: WaitProcess
        when: 
          - "={{ $P.enableWait == true }}"

  WaitProcess:
    - - node: LogEnd
`;