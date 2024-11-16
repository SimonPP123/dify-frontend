export class WorkflowConnectionManager {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly HEARTBEAT_INTERVAL = 5000;
  private readonly RECONNECT_DELAY = 2000;
  
  constructor(
    private onReconnect: (workflowRunId: string) => Promise<void>,
    private onError: (error: Error) => void
  ) {}

  startHeartbeat(workflowRunId: string, taskId: string) {
    this.stopHeartbeat(); // Clear any existing interval
    
    this.heartbeatInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/workflows/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ workflowRunId, taskId })
        });

        if (!response.ok) {
          throw new Error('Heartbeat failed');
        }
      } catch (error) {
        this.handleConnectionError(workflowRunId);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private async handleConnectionError(workflowRunId: string) {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.stopHeartbeat();
      this.onError(new Error('Maximum reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    
    try {
      await new Promise(resolve => setTimeout(resolve, this.RECONNECT_DELAY));
      await this.onReconnect(workflowRunId);
      this.reconnectAttempts = 0; // Reset on successful reconnection
    } catch (error) {
      this.handleConnectionError(workflowRunId);
    }
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}