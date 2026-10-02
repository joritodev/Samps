import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/permissions/check";
import { canAccessClient, hasPermission } from "@/lib/permissions/resolve";
import { MAX_UPLOAD_BYTES } from "@/lib/storage/image-upload";
import {
  CoverError,
  removeBoardCover,
  uploadBoardCover,
} from "@/lib/services/board-cover.service";

export const runtime = "nodejs";

type Ctx = { params: { clientId: string } };

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Mesma origem apenas: o cookie de sessão não basta para aceitar a escrita. */
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

async function authorize(req: Request, clientId: string) {
  if (!sameOrigin(req)) return { error: fail("Origem não permitida.", 403) };
  const user = await getSessionUser();
  if (!user) return { error: fail("Faça login novamente.", 401) };
  if (
    !canAccessClient(user.permissions, user.clientIds, clientId) ||
    !hasPermission(user.permissions, "clients.edit")
  ) {
    return { error: fail("Sem permissão.", 403) };
  }
  return { user };
}

function done(clientId: string) {
  revalidatePath(`/clientes/${clientId}/quadro`);
  revalidatePath(`/clientes/${clientId}/quadro/configuracoes`);
}

export async function POST(req: Request, { params }: Ctx) {
  const auth = await authorize(req, params.clientId);
  if (auth.error) return auth.error;

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) {
    return fail("A imagem passa de 4 MB.", 413);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Envio inválido.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Escolha uma foto.", 400);
  if (file.size > MAX_UPLOAD_BYTES) return fail("A imagem passa de 4 MB.", 413);

  const num = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" && v !== "" ? Number(v) : NaN;
  };

  try {
    const coverImage = await uploadBoardCover({
      clientId: params.clientId,
      actorId: auth.user.id,
      file: Buffer.from(await file.arrayBuffer()),
      crop: { x: num("x"), y: num("y"), w: num("w") },
    });
    done(params.clientId);
    return NextResponse.json({ coverImage });
  } catch (e) {
    if (e instanceof CoverError) return fail(e.message, e.status);
    console.error("[board-cover] upload falhou", e);
    return fail("Não foi possível salvar a foto.", 500);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await authorize(req, params.clientId);
  if (auth.error) return auth.error;
  try {
    await removeBoardCover({ clientId: params.clientId, actorId: auth.user.id });
    done(params.clientId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CoverError) return fail(e.message, e.status);
    console.error("[board-cover] remoção falhou", e);
    return fail("Não foi possível remover a foto.", 500);
  }
}
