import { useParams } from "react-router";

export function ListPage() {
  const { id } = useParams();

  return <h1 className="font-heading text-2xl font-semibold">List {id}</h1>;
}
