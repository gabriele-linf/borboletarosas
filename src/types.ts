export interface SensorData {
  presence: boolean;
  temperature: number; // in Celsius
  voltage: number; // simulated ADC voltage
  rawValue: number; // analog reading (0-1023)
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'alert' | 'error' | 'success';
}

export interface ArmRegister {
  name: string;
  value: string;
  description: string;
}

export interface PipelineStage {
  name: 'Fetch' | 'Decode' | 'Execute';
  instruction: string;
  status: 'idle' | 'active' | 'done';
}
