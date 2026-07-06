import React from 'react';
import { CheckCircle2, Circle, Loader2, PlayCircle } from 'lucide-react';
import { AgentTask } from '../../utils/agentSystem';

interface AgentProgressProps {
  tasks: AgentTask[];
  activeArtifactType?: string;
}

export const AgentProgress: React.FC<AgentProgressProps> = ({ tasks, activeArtifactType }) => {
  return (
    <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl my-3 space-y-3 shadow-inner max-w-md animate-fade-in select-none">
      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-850">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
          <PlayCircle className="w-3.5 h-3.5 text-emerald-450" />
          <span>Multi-Agent Task Orchestrator</span>
        </span>
        {activeArtifactType && (
          <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 uppercase font-mono">
            {activeArtifactType} Workspace
          </span>
        )}
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-2.5 text-xs">
            {/* Status Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {task.status === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-450 stroke-[2.5]" />
              )}
              {task.status === 'running' && (
                <Loader2 className="w-4 h-4 text-amber-500 animate-spin stroke-[2.5]" />
              )}
              {task.status === 'pending' && (
                <Circle className="w-4 h-4 text-zinc-650" />
              )}
              {task.status === 'failed' && (
                <div className="w-4 h-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] flex items-center justify-center font-bold font-mono">
                  !
                </div>
              )}
            </div>

            {/* Task Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`font-semibold text-xs ${
                  task.status === 'running' 
                    ? 'text-amber-400' 
                    : task.status === 'success' 
                      ? 'text-zinc-450' 
                      : 'text-zinc-500'
                }`}>
                  {task.agentName}
                </span>
              </div>
              <p className={`text-[10.5px] mt-0.5 leading-relaxed ${
                task.status === 'running' 
                  ? 'text-zinc-200' 
                  : task.status === 'success' 
                    ? 'text-zinc-500' 
                    : 'text-zinc-600'
              }`}>
                {task.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
