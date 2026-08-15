def get_web_sources(message):
    """Get web sources from an AI message."""

    sources = []
    seen_urls = set()

    for block in message.content_blocks:

        # Citations are stored inside text blocks
        if block.get("type") != "text":
            continue

        annotations = block.get("annotations", [])

        # Find citation annotations
        for annotation in annotations:
            if annotation.get("type") != "citation":
                continue

            title = annotation.get("title", "source")
            url = annotation.get("url")

            # Skip missing or duplicate URLs
            if not url or url in seen_urls:
                continue

            seen_urls.add(url)

            sources.append(
                {
                    "title":title,
                    "url":url
                }
            )
    return sources