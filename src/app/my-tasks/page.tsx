import MyTasks from "../../components/MyTasks";

export default function Page() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ fontWeight: 600, fontSize: 20 }}>My Tasks</h1>
        <MyTasks />

    </div>
  );
}
