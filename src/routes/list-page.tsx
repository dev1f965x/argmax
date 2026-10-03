import { useParams } from "react-router";

export function ListPage() {
  const { id } = useParams();

  return <h1 className="text-title font-bold">List {id}</h1>;
}
