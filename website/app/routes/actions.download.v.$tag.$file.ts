import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';

import { downloadVariableFile } from '@/utils/download/download';
import { generateVariableManifestItem } from '@/utils/download/manifest';
import { getMetadata } from '@/utils/metadata.server';

export const loader: LoaderFunction = async () => {
	return redirect('/');
};

export const action: ActionFunction = async ({ request, params }) => {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader) {
		throw new Response('Unauthorized. Missing authorization header.', {
			status: 401,
		});
	}
	const [scheme, encoded] = authHeader.split(' ');

	// The Authorization header must start with Bearer, followed by a space.
	if (!encoded || scheme !== 'Bearer') {
		throw new Response('Bad Request. Malformed authorization header.', {
			status: 400,
		});
	}

	if (encoded !== process.env.UPLOAD_KEY) {
		throw new Response('Unauthorized. Invalid authorization token.', {
			status: 401,
		});
	}

	const { tag, file } = params;
	if (!tag) {
		throw new Response('Bad Request. Missing font tag in URL.', {
			status: 400,
		});
	}
	if (!file) {
		throw new Response('Bad Request. Missing file in URL.', {
			status: 400,
		});
	}

	const [id, version] = tag.split('@');
	if (!id || !version || version.split('.').length !== 3) {
		throw new Response('Bad Request. Invalid font tag.', { status: 400 });
	}

	const metadata = await getMetadata(id);
	if (!metadata) {
		throw new Response('Not Found. Font does not exist.', { status: 404 });
	}

	const manifestItem = generateVariableManifestItem(tag, file, metadata);
	await downloadVariableFile(manifestItem);

	return new Response('Success!', { status: 201 });
};