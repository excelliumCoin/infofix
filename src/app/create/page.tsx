import CreateTaskForm from "@/components/CreateTaskForm";

export default function Page(){
  return (
    <div style={{ maxWidth: 640, display: "grid", gap: 16 }}>
      <h1 style={{ fontWeight: 600, fontSize: 20 }}>Create Task</h1>
      <CreateTaskForm />
    </div>
  );
}
