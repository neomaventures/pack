FROM minio/minio:RELEASE.2025-09-07T16-13-09Z

# mc isn't shipped in the official minio image — install it for the entrypoint
RUN curl -sSL https://dl.min.io/client/mc/release/linux-amd64/mc \
    -o /usr/local/bin/mc && chmod +x /usr/local/bin/mc

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Run as non-root. The base image is RHEL UBI without useradd/groupadd, so we
# append directly to /etc/passwd and /etc/group. /data is chowned at build time;
# Render's persistent disk mount preserves this ownership when reattached.
RUN echo 'minio:x:10001:10001::/home/minio:/sbin/nologin' >> /etc/passwd \
    && echo 'minio:x:10001:' >> /etc/group \
    && mkdir -p /data /home/minio \
    && chown -R minio:minio /data /home/minio /usr/local/bin/mc /usr/local/bin/entrypoint.sh

USER minio:minio

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
