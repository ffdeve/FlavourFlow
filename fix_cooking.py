with open('src/app/cooking-mode.tsx', 'r') as f:
    content = f.read()

content = content.replace('step.video_start_time || 0', 'step.video_start_time_frame || step.video_start_time || 0')
content = content.replace('currentStepData?.video_start_time || 0', 'currentStepData?.video_start_time_frame || currentStepData?.video_start_time || 0')

with open('src/app/cooking-mode.tsx', 'w') as f:
    f.write(content)
