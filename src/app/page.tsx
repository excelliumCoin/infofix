import TaskList from "@/components/TaskList";

export default function Page(){
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ fontWeight: 600, fontSize: 20 }}>Active Tasks</h1>
      <TaskList />
    </div>
  );
}
